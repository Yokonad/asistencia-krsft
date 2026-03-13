import { useState, useMemo, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import { useTrabajadoresData } from '../hooks/useTrabajadoresData';
import CustomSelect from './ui/CustomSelect';

export default function PersonasTab({ onCountChange }) {
  const { trabajadores, loading, error } = useTrabajadoresData();
  const [search, setSearch] = useState('');
  const [filterCargo, setFilterCargo] = useState('Todos');
  const [filterContrato, setFilterContrato] = useState('Todos');

  const cargoOptions = useMemo(() => {
    const cargos = trabajadores.map((t) => t.cargo).filter(Boolean);
    return ['Todos', ...new Set(cargos)];
  }, [trabajadores]);

  const contratoOptions = useMemo(() => {
    const tipos = trabajadores.map((t) => t.tipo_contrato).filter(Boolean);
    return ['Todos', ...new Set(tipos)];
  }, [trabajadores]);

  useEffect(() => {
    onCountChange?.(trabajadores.length);
  }, [trabajadores.length, onCountChange]);

  const filtered = useMemo(() => {
    let rows = trabajadores;

    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          (t.nombre_completo || '').toLowerCase().includes(term) ||
          (t.dni || '').includes(term) ||
          (t.cargo || '').toLowerCase().includes(term)
      );
    }

    if (filterCargo !== 'Todos') {
      rows = rows.filter((t) => t.cargo === filterCargo);
    }

    if (filterContrato !== 'Todos') {
      rows = rows.filter((t) => t.tipo_contrato === filterContrato);
    }

    return rows;
  }, [trabajadores, search, filterCargo, filterContrato]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded border border-gray-300 bg-white shadow-sm">
        <svg className="size-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando trabajadores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="relative flex-grow w-full">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Buscar</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded border border-gray-100 py-2 pl-9 text-gray-900 placeholder:text-gray-400 focus:border-[#00BFA6] focus:ring-1 focus:ring-[#00BFA6] text-xs shadow-sm"
              placeholder="Buscar por nombre, DNI o cargo..."
            />
          </div>
        </div>
        <div className="min-w-[150px]">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cargo</label>
          <CustomSelect
            options={cargoOptions}
            value={filterCargo}
            onChange={setFilterCargo}
            className="rounded border-gray-200 py-[9px] pl-3 pr-2 text-[13px] bg-white w-full"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contrato</label>
          <CustomSelect
            options={contratoOptions}
            value={filterContrato}
            onChange={setFilterContrato}
            className="rounded border-gray-200 py-[9px] pl-3 pr-2 text-[13px] bg-white w-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{filtered.length} persona{filtered.length !== 1 ? 's' : ''}</p>
        <p className="text-xs text-gray-400">Fuente: Módulo Trabajadores</p>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map((persona) => (
          <div key={persona.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-5 py-3 shadow-sm hover:shadow transition-shadow">
            <div>
              <h3 className="text-[13px] font-bold text-gray-800 uppercase leading-snug">{persona.nombre_completo}</h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <span className="flex items-center gap-1">
                  <IdentificationIcon className="size-3.5" />
                  {persona.dni}
                </span>
                <span>·</span>
                <span>{persona.cargo || 'Sin cargo'}</span>
                {persona.tipo_contrato && (
                  <>
                    <span>·</span>
                    <span>{persona.tipo_contrato}</span>
                  </>
                )}
                {persona.fecha_ingreso && (
                  <>
                    <span>·</span>
                    <span>Ingreso: {persona.fecha_ingreso}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
                persona.estado === 'Activo'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}>
                {persona.estado}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 rounded border border-gray-300 bg-white shadow-sm">
            <p className="text-sm text-gray-500">No se encontraron trabajadores con los filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
