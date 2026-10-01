create or replace function public.validar_profesor_materia()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.profesor_materia pm
     where pm.profesor_id = new.profesor_id
       and pm.materia_id = new.materia_id
  ) then
    raise exception 'El profesor seleccionado no está habilitado para dictar la materia asignada.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_profesor_materia on public.turnos_clase;
create trigger trg_validar_profesor_materia
before insert or update of profesor_id, materia_id
on public.turnos_clase
for each row
execute function public.validar_profesor_materia();

notify pgrst, 'reload schema';
