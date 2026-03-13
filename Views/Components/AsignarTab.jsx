import { 
  BuildingOfficeIcon, 
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import CustomSelect from './ui/CustomSelect';
import CustomDatePicker from './ui/CustomDatePicker';

export default function AsignarTab() {
  // Datos mockeados según imagen
  const asignaciones = [
    { id: 1, nombre: 'VILLANUEVA FERNANDEZ BRYAN DANIEL', tipo: 'Oficina', fecha: '11/04/2026' },
    { id: 2, nombre: 'VILLANUEVA FERNANDEZ BRYAN DANIEL', tipo: 'Oficina', fecha: '10/04/2026' },
    { id: 3, nombre: 'VILLANUEVA FERNANDEZ BRYAN DANIEL', tipo: 'Oficina', fecha: '09/04/2026' },
    { id: 4, nombre: 'VILLANUEVA FERNANDEZ BRYAN DANIEL', tipo: 'Oficina', fecha: '08/04/2026' },
  ];

  return (
    <div className="space-y-6 pt-2">
      {/* Panel Formulario Asignar */}
      <div className="rounded-md border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-[14px] font-bold text-slate-800 mb-3 uppercase">Asignar Proyecto</h2>
        
        <div className="space-y-4">
          <CustomSelect 
            options={['VILLANUEVA FERNANDEZ BRYAN DANIEL']} 
            placeholder="Selecciona persona"
            className="rounded py-2 pl-3 pr-2 text-xs bg-white w-full" 
          />

          <CustomSelect 
            options={['Plastic Alpha', 'Mina']} 
            placeholder="Selecciona proyecto"
            className="rounded py-2 pl-3 pr-2 text-xs bg-white w-full" 
          />

          <CustomDatePicker
            type="date"
            defaultValue="2026-03-12"
          />

          <div className="flex gap-4 pt-2">
            <Button
              variant="primary"
              size="md"
              className="gap-2 flex-grow shadow-sm"
            >
              <PlusIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
              Asignar
            </Button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded border border-gray-200 bg-slate-50 px-6 py-2 text-[14px] font-medium text-slate-700 shadow-sm hover:bg-slate-100 transition-colors shrink-0"
            >
              <BuildingOfficeIcon className="h-4 w-4" aria-hidden="true" />
              Oficina
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Asignaciones */}
      <div className="space-y-3">
        {asignaciones.map((asignacion) => (
          <div key={asignacion.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-5 py-3 shadow-sm hover:shadow transition-shadow">
            <div>
              <h3 className="text-[13px] font-bold text-gray-800 uppercase leading-snug">{asignacion.nombre}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <span>{asignacion.tipo}</span>
                <span>—</span>
                <span>{asignacion.fecha}</span>
              </p>
            </div>
            
            <button className="inline-flex items-center justify-center rounded border border-red-200 bg-red-50 p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 shadow-sm">
              <TrashIcon className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
