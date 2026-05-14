insert into phases (lot_id, phase_name, status)
select lots.id, 'Roof Dry In', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Roof Dry In');

insert into phases (lot_id, phase_name, status)
select lots.id, 'Electrical Rough', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Electrical Rough');

insert into phases (lot_id, phase_name, status)
select lots.id, 'HVAC Rough', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'HVAC Rough');

insert into phases (lot_id, phase_name, status)
select lots.id, 'Plumbing Rough', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Plumbing Rough');

insert into phases (lot_id, phase_name, status)
select lots.id, 'Low Voltage', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Low Voltage');

insert into phases (lot_id, phase_name, status)
select lots.id, 'Insulation', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Insulation');

insert into phases (lot_id, phase_name, status)
select lots.id, 'Brown & Stucco', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Brown & Stucco');

insert into phases (lot_id, phase_name, status)
select lots.id, 'Install Trim', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Install Trim');

insert into phases (lot_id, phase_name, status)
select lots.id, 'Electrical Trim Out', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Electrical Trim Out');

insert into phases (lot_id, phase_name, status)
select lots.id, 'Plumbing Trim Out', 'not_started' from lots
where lots.id not in (select lot_id from phases where phase_name = 'Plumbing Trim Out');
