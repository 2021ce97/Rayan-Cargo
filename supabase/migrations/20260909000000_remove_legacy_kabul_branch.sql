-- Kabul is represented only by the Admin HQ branch (br_admin_hq / KBL-HQ).
-- Preserve historical records by remapping the legacy KBL-01 branch first.
UPDATE public.shipments SET origin_branch_id = 'br_admin_hq' WHERE origin_branch_id = 'br_kbl_01';
UPDATE public.shipments SET destination_branch_id = 'br_admin_hq' WHERE destination_branch_id = 'br_kbl_01';
UPDATE public.shipments SET current_branch_id = 'br_admin_hq' WHERE current_branch_id = 'br_kbl_01';
UPDATE public.branch_expenses SET branch_id = 'br_admin_hq' WHERE branch_id = 'br_kbl_01';
UPDATE public.branch_settlements SET origin_branch_id = 'br_admin_hq' WHERE origin_branch_id = 'br_kbl_01';
UPDATE public.branch_settlements SET destination_branch_id = 'br_admin_hq' WHERE destination_branch_id = 'br_kbl_01';
UPDATE public.branch_settlements SET branch_id = 'br_admin_hq' WHERE branch_id = 'br_kbl_01';
DELETE FROM public.users WHERE id IN ('usr_kbl_01', 'usr_kbl_mgr') OR branch_id = 'br_kbl_01';
DELETE FROM public.branches WHERE id = 'br_kbl_01' OR code = 'KBL-01';