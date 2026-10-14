-- Automatic activity logging for every property-related change.
alter table public.activity_log add column if not exists address text;
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

create or replace function public._activity_actor() returns text
language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    (select email from auth.users where id = auth.uid()),
    'Homeowner / link'
  );
$$;

create or replace function public._log_activity(p_lot uuid, p_phase uuid, p_action text, p_details text, p_address text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_addr text := p_address;
begin
  -- Skip rows removed by a cascading delete (parent already gone)
  if p_lot is not null and not exists (select 1 from lots where id = p_lot) then return; end if;
  if p_phase is not null and not exists (select 1 from phases where id = p_phase) then p_phase := null; end if;
  if v_addr is null and p_lot is not null then select nullif(trim(address), '') into v_addr from lots where id = p_lot; end if;
  insert into activity_log (lot_id, phase_id, user_id, user_email, action, details, address)
  values (p_lot, p_phase, auth.uid(), public._activity_actor(), p_action, p_details, v_addr);
end $$;

create or replace function public._fmt_date(d date) returns text language sql immutable as $$
  select case when d is null then 'cleared' else to_char(d, 'Mon FMDD, YYYY') end;
$$;

create or replace function public._type_label(t text) returns text language sql immutable as $$
  select case coalesce(t, 'spec') when 'spec' then 'Spec Homes' when 'construction' then 'Spec Homes'
    when 'customer' then 'Customer Homes' when 'vacant' then 'Vacant Lots' when 'micah' then 'Micah''s Projects' else t end;
$$;

create or replace function public._status_label(s text) returns text language sql immutable as $$
  select case s when 'not_started' then 'Not Started' when 'in_progress' then 'In Progress' when 'complete' then 'Complete' else s end;
$$;

create or replace function public.trg_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record; o record; ph text; lot uuid;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_op = 'UPDATE' then o := old; end if;

  case tg_table_name
  when 'lots' then
    if tg_op = 'INSERT' then
      perform _log_activity(new.id, null, 'lot_added', 'New address added' || coalesce(': ' || nullif(trim(new.address), ''), ''));
    elsif tg_op = 'DELETE' then
      perform _log_activity(null, null, 'lot_deleted', 'Address deleted', coalesce(nullif(trim(old.address), ''), 'Unnamed address'));
    else
      if new.address is distinct from old.address then
        perform _log_activity(new.id, null, 'lot_edit', 'Address changed from "' || coalesce(nullif(old.address, ''), 'blank') || '" to "' || coalesce(new.address, '') || '"'); end if;
      if new.owner is distinct from old.owner then
        perform _log_activity(new.id, null, 'lot_edit', 'Owner set to "' || coalesce(new.owner, '') || '"'); end if;
      if new.budget is distinct from old.budget then
        perform _log_activity(new.id, null, 'lot_edit', 'Budget changed from ' || coalesce(nullif(old.budget, ''), 'blank') || ' to ' || coalesce(nullif(new.budget, ''), 'blank')); end if;
      if new.notes is distinct from old.notes then
        perform _log_activity(new.id, null, 'lot_edit', 'Property notes updated: "' || left(coalesce(new.notes, ''), 140) || '"'); end if;
      if new.lot_type is distinct from old.lot_type then
        perform _log_activity(new.id, null, 'lot_moved', 'Moved from ' || _type_label(old.lot_type) || ' to ' || _type_label(new.lot_type)); end if;
      if new.archived is distinct from old.archived then
        perform _log_activity(new.id, null, 'lot_archived', case when new.archived then 'Moved to Completed / Archived' else 'Restored to active' end); end if;
    end if;

  when 'phases' then
    if tg_op = 'UPDATE' then
      if new.status is distinct from old.status then
        perform _log_activity(new.lot_id, new.id, 'status_change', new.phase_name || ' changed to ' || _status_label(new.status)); end if;
      if new.projected_start is distinct from old.projected_start then
        perform _log_activity(new.lot_id, new.id, 'date_change', new.phase_name || ' start date set to ' || _fmt_date(new.projected_start)); end if;
      if new.projected_end is distinct from old.projected_end then
        perform _log_activity(new.lot_id, new.id, 'date_change', new.phase_name || ' end date set to ' || _fmt_date(new.projected_end)); end if;
      if new.actual_start is distinct from old.actual_start then
        perform _log_activity(new.lot_id, new.id, 'date_change', new.phase_name || ' actual start set to ' || _fmt_date(new.actual_start)); end if;
      if new.actual_end is distinct from old.actual_end then
        perform _log_activity(new.lot_id, new.id, 'date_change', new.phase_name || ' actual end set to ' || _fmt_date(new.actual_end)); end if;
      if coalesce(new.notes, '') is distinct from coalesce(old.notes, '') then
        perform _log_activity(new.lot_id, new.id, 'note', new.phase_name || ' note: "' || left(coalesce(new.notes, ''), 140) || '"'); end if;
    end if;

  when 'phase_checklist' then
    select phase_name into ph from phases where id = r.phase_id;
    if tg_op = 'INSERT' and not coalesce(new.is_preset, false) then
      perform _log_activity(new.lot_id, new.phase_id, 'checklist_add', coalesce(ph, 'Checklist') || ' item added: "' || coalesce(new.item, '') || '"');
    elsif tg_op = 'UPDATE' then
      if new.completed is distinct from old.completed then
        perform _log_activity(new.lot_id, new.phase_id, 'checklist_check', coalesce(ph, 'Checklist') || case when new.completed then ' item checked off: "' else ' item unchecked: "' end || coalesce(new.item, '') || '"'); end if;
      if new.item is distinct from old.item then
        perform _log_activity(new.lot_id, new.phase_id, 'checklist_edit', coalesce(ph, 'Checklist') || ' item edited: "' || coalesce(new.item, '') || '"'); end if;
    elsif tg_op = 'DELETE' and not coalesce(old.is_preset, false) then
      perform _log_activity(old.lot_id, old.phase_id, 'checklist_delete', coalesce(ph, 'Checklist') || ' item removed: "' || coalesce(old.item, '') || '"');
    end if;

  when 'phase_photos' then
    select phase_name into ph from phases where id = r.phase_id;
    if tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, new.phase_id, 'photo_upload', 'Photo uploaded to ' || coalesce(ph, 'phase'));
    elsif tg_op = 'DELETE' then
      perform _log_activity(old.lot_id, old.phase_id, 'photo_delete', 'Photo deleted from ' || coalesce(ph, 'phase'));
    end if;

  when 'punch_list' then
    if tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, null, 'punch_add', 'Punch list item added: "' || coalesce(new.item, '') || '"');
    elsif tg_op = 'UPDATE' and new.completed is distinct from old.completed then
      perform _log_activity(new.lot_id, null, 'punch_check', case when new.completed then 'Punch list item checked off: "' else 'Punch list item unchecked: "' end || coalesce(new.item, '') || '"');
    elsif tg_op = 'DELETE' then
      perform _log_activity(old.lot_id, null, 'punch_delete', 'Punch list item removed: "' || coalesce(old.item, '') || '"');
    end if;

  when 'punch_signatures' then
    if tg_op = 'UPDATE' and new.homeowner_name is not null and old.homeowner_name is null then
      perform _log_activity(new.lot_id, null, 'signature', 'Homeowner ' || new.homeowner_name || ' signed the ' || coalesce(new.signature_type, '') || ' sign-off');
    elsif tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, null, 'signature_link', 'Sign-off link created (' || coalesce(new.signature_type, '') || ')');
    end if;

  when 'lot_documents' then
    if tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, null, 'document', 'Document uploaded: ' || coalesce(new.file_name, ''));
    elsif tg_op = 'DELETE' then
      perform _log_activity(old.lot_id, null, 'document_delete', 'Document deleted: ' || coalesce(old.file_name, ''));
    end if;

  when 'finishes_vision' then
    if tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, null, 'finishes', 'Finishes file uploaded: ' || coalesce(new.file_name, ''));
    elsif tg_op = 'DELETE' then
      perform _log_activity(old.lot_id, null, 'finishes_delete', 'Finishes file deleted: ' || coalesce(old.file_name, ''));
    end if;

  when 'lot_members' then
    if tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, null, 'team', 'Team member added: ' || coalesce(new.full_name, new.user_email, '') || ' (' || coalesce(new.role, '') || ')');
    elsif tg_op = 'DELETE' then
      perform _log_activity(old.lot_id, null, 'team', 'Team member removed: ' || coalesce(old.full_name, old.user_email, ''));
    end if;

  when 'warranties' then
    if tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, null, 'warranty', 'Warranty request created' || coalesce(' for ' || new.homeowner_name, ''));
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      perform _log_activity(new.lot_id, null, 'warranty', 'Warranty status changed to ' || coalesce(new.status, ''));
    end if;

  when 'warranty_items' then
    select lot_id into lot from warranties where id = r.warranty_id;
    if tg_op = 'INSERT' then
      perform _log_activity(lot, null, 'warranty_item', 'Warranty item added: "' || coalesce(new.description, '') || '"');
    elsif tg_op = 'UPDATE' and new.completed is distinct from old.completed then
      perform _log_activity(lot, null, 'warranty_item', case when new.completed then 'Warranty item completed: "' else 'Warranty item reopened: "' end || coalesce(new.description, '') || '"');
    end if;

  when 'interest_loans' then
    if tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, null, 'loan', 'Loan added' || coalesce(' with ' || new.lender_name, '') || coalesce(' ($' || to_char(new.loan_amount, 'FM999,999,999') || ')', ''));
    elsif tg_op = 'UPDATE' and (new.loan_amount, new.interest_rate, new.lender_name) is distinct from (old.loan_amount, old.interest_rate, old.lender_name) then
      perform _log_activity(new.lot_id, null, 'loan', 'Loan details updated' || coalesce(' (' || new.lender_name || ')', ''));
    end if;

  when 'loan_draws' then
    select lot_id into lot from interest_loans where id = r.loan_id;
    if tg_op = 'INSERT' then
      perform _log_activity(lot, null, 'loan', 'Loan draw added' || coalesce(': ' || new.draw_name, '') || coalesce(' ($' || to_char(new.amount, 'FM999,999,999') || ')', ''));
    end if;

  when 'loan_payments' then
    if tg_op = 'INSERT' then
      perform _log_activity(new.lot_id, null, 'loan', 'Loan payment recorded' || coalesce(' ($' || to_char(new.payment_amount, 'FM999,999,990.00') || ')', ''));
    end if;

  when 'prospective_lots' then
    if tg_op = 'INSERT' then
      perform _log_activity(null, null, 'prospect', 'Prospective address added', coalesce(nullif(trim(new.address), ''), 'Prospective Pipeline'));
    elsif tg_op = 'DELETE' then
      perform _log_activity(null, null, 'prospect', 'Prospective address deleted', coalesce(nullif(trim(old.address), ''), 'Prospective Pipeline'));
    else
      if new.address is distinct from old.address then
        perform _log_activity(null, null, 'prospect', 'Prospective address set to "' || coalesce(new.address, '') || '"', coalesce(nullif(trim(new.address), ''), 'Prospective Pipeline')); end if;
      if new.status is distinct from old.status then
        perform _log_activity(null, null, 'prospect', 'Prospect status changed to ' || coalesce(new.status, ''), coalesce(nullif(trim(new.address), ''), 'Prospective Pipeline')); end if;
      if new.notes is distinct from old.notes then
        perform _log_activity(null, null, 'prospect', 'Prospect notes updated: "' || left(coalesce(new.notes, ''), 140) || '"', coalesce(nullif(trim(new.address), ''), 'Prospective Pipeline')); end if;
      if (new.estimated_value, new.follow_up_date) is distinct from (old.estimated_value, old.follow_up_date) then
        perform _log_activity(null, null, 'prospect', 'Prospect value / follow-up updated', coalesce(nullif(trim(new.address), ''), 'Prospective Pipeline')); end if;
    end if;

  when 'prospective_photos', 'prospective_docs' then
    if tg_op = 'INSERT' then
      perform _log_activity(null, null, 'prospect',
        case when tg_table_name = 'prospective_photos' then 'Photo added to prospect' else 'Document added to prospect: ' || coalesce(new.file_name, '') end,
        coalesce((select nullif(trim(address), '') from prospective_lots where id = new.lot_id), 'Prospective Pipeline'));
    end if;
  else null;
  end case;

  return null;
exception when others then
  -- Never block the user's change because logging failed
  raise warning 'activity log failed: %', sqlerrm;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['lots','phases','phase_checklist','phase_photos','punch_list','punch_signatures','lot_documents',
    'finishes_vision','lot_members','warranties','warranty_items','interest_loans','loan_draws','loan_payments',
    'prospective_lots','prospective_photos','prospective_docs'] loop
    execute format('drop trigger if exists zz_activity on public.%I', t);
    execute format('create trigger zz_activity after insert or update or delete on public.%I for each row execute function public.trg_activity()', t);
  end loop;
end $$;

-- Backfill addresses on existing log rows
update public.activity_log a set address = nullif(trim(l.address), '') from public.lots l where l.id = a.lot_id and a.address is null;
