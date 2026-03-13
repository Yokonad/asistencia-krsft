import { useCallback, useState } from 'react';
import { TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import ConfirmModal from './modals/ConfirmModal';

export default function AsistenciaTable({ asistencias, loading, onEdit, onDelete }) {
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', id: null });
  const openConfirm = useCallback((id, title, message) => setConfirmModal({ open: true, title, message, id }), []);
  const closeConfirm = useCallback(() => setConfirmModal({ open: false, title: '', message: '', id: null }), []);
  const handleConfirmed = useCallback(() => { onDelete?.(confirmModal.id); closeConfirm(); }, [confirmModal.id, onDelete, closeConfirm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded border border-gray-300 bg-white shadow-sm">
        <svg className="size-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando estado de asistencia...</p>
      </div>
    );
  }

  if (!asistencias || asistencias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded border border-gray-300 bg-white shadow-sm">
        <p className="text-sm text-gray-500">Nadie se registró el día de hoy.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white border-b border-gray-200">
            <tr className="*:px-4 *:py-4 *:text-left *:text-[13px] *:font-bold *:text-slate-800 *:whitespace-nowrap">
              <th>Persona</th>
              <th>Cargo</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {asistencias.map((row) => {
              const isRegistered = Boolean(row.id);

              return (
                <tr key={`${row.trabajador_id || 'row'}-${row.id || 'pending'}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-[13px] font-bold text-slate-900">{row.trabajador_nombre}</p>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-medium">DNI: {row.dni || '—'}</p>
                  </td>
                  <td className="px-4 py-4 text-[13px] font-medium text-slate-600 whitespace-nowrap">
                    {row.cargo || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-4 text-[13px] font-bold text-slate-800 whitespace-nowrap">
                    {row.hora_entrada || '—'}
                  </td>
                  <td className="px-4 py-4 text-[13px] font-bold text-slate-800 whitespace-nowrap">
                    —
                  </td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-1 text-xs font-bold ${isRegistered ? 'bg-[#e5fcf5] text-[#00BFA6]' : 'bg-amber-50 text-amber-700'}`}>
                      {isRegistered ? 'Registrado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[13px] font-medium text-slate-500 whitespace-nowrap">
                    {row.fecha || '—'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit?.(row)}
                        title={isRegistered ? 'Editar registro' : 'Registrar asistencia'}
                        className="inline-flex items-center justify-center rounded border border-gray-200 bg-white p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 shadow-sm"
                      >
                        <Bars3Icon className="size-4" />
                      </button>
                      <button
                        onClick={() => isRegistered && openConfirm(row.id, 'Eliminar asistencia', '¿Estás seguro de que deseas eliminar este registro?')}
                        disabled={!isRegistered}
                        className="inline-flex items-center justify-center rounded border border-red-200 bg-red-50 p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 shadow-sm disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={closeConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        actionLabel="Sí, eliminar"
        actionVariant="danger"
        onConfirm={handleConfirmed}
      />
    </div>
  );
}
