import { useState, useEffect } from 'react';
import { validateAsistenciaData, createEmptyAsistencia } from '../utils/helpers';
import CustomDatePicker from './ui/CustomDatePicker';

export default function AsistenciaModal({ isOpen, onClose, onSubmit, initialData }) {
  const [data, setData] = useState(createEmptyAsistencia());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [lookingUpWorker, setLookingUpWorker] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData({ ...createEmptyAsistencia(), ...initialData });
    } else {
      setData(createEmptyAsistencia());
    }
    setErrors({});
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen || data.dni.length !== 8 || data.trabajador_id) {
      return;
    }

    let cancelled = false;

    const lookupWorker = async () => {
      setLookingUpWorker(true);

      try {
        const response = await fetch(`/api/worker-by-dni?dni=${data.dni}`);
        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !result.success) {
          setData((prev) => ({
            ...prev,
            trabajador_id: null,
            trabajador_nombre: '',
            area: '',
          }));
          setErrors((prev) => ({
            ...prev,
            dni: result.message || 'No se encontró el trabajador',
          }));
          return;
        }

        setData((prev) => ({
          ...prev,
          trabajador_id: result.worker.id,
          trabajador_nombre: result.worker.nombre_completo || '',
          area: result.worker.cargo || '',
        }));
        setErrors((prev) => ({
          ...prev,
          dni: '',
        }));
      } catch (err) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            dni: 'No se pudo validar el DNI',
          }));
        }
      } finally {
        if (!cancelled) {
          setLookingUpWorker(false);
        }
      }
    };

    lookupWorker();

    return () => {
      cancelled = true;
    };
  }, [data.dni, data.trabajador_id, isOpen]);

  const handleChange = (field, value) => {
    if (field === 'dni') {
      const normalizedDni = value.replace(/\D/g, '').slice(0, 8);

      setData((prev) => ({
        ...prev,
        dni: normalizedDni,
        trabajador_id: normalizedDni === prev.dni ? prev.trabajador_id : null,
        trabajador_nombre: normalizedDni === prev.dni ? prev.trabajador_nombre : '',
        area: normalizedDni === prev.dni ? prev.area : '',
      }));

      setErrors((prev) => ({
        ...prev,
        dni: '',
        submit: '',
      }));
      return;
    }

    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    const { isValid, errors: validationErrors } = validateAsistenciaData(data);
    if (!isValid) { setErrors(validationErrors); return; }
    setLoading(true);
    const result = await onSubmit(data);
    setLoading(false);
    if (!result.success) setErrors({ submit: result.message });
  };

  const isEditMode = !!initialData && !initialData._new;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asistenciaModalTitle"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 id="asistenciaModalTitle" className="text-[15px] font-bold text-slate-800 uppercase tracking-wide">
            {isEditMode ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 pb-2 space-y-4">
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                Información General
              </span>
            </div>
          </div>

          {errors.submit && (
            <div role="alert" className="rounded-md border border-red-500 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">{errors.submit}</p>
            </div>
          )}

          <label htmlFor="asistencia-dni" className="block mt-4">
            <span className="text-[14px] font-medium text-slate-700">DNI <span className="text-red-500">*</span></span>
            <input
              id="asistencia-dni"
              type="text"
              placeholder="Número de documento"
              value={data.dni}
              onChange={(e) => handleChange('dni', e.target.value)}
              autoComplete="off"
              className={`mt-1.5 w-full rounded-md border py-2 px-3 shadow-none sm:text-sm focus:outline-none focus:border-[#00BFA6] focus:ring-1 focus:ring-[#00BFA6] ${errors.dni ? 'border-red-300' : 'border-gray-200 text-slate-900'}`}
            />
            {lookingUpWorker && <p className="mt-1 text-xs text-slate-500">Validando trabajador...</p>}
            {errors.dni && <p className="mt-1 text-xs text-red-600">{errors.dni}</p>}
          </label>

          <label htmlFor="asistencia-nombre" className="block">
            <span className="text-[14px] font-medium text-slate-700">Trabajador validado</span>
            <input
              id="asistencia-nombre"
              type="text"
              placeholder="El nombre se completa desde Trabajadores"
              value={data.trabajador_nombre}
              autoComplete="off"
              readOnly
              className="mt-1.5 w-full rounded-md border border-gray-200 bg-slate-50 py-2 px-3 text-slate-900 shadow-none sm:text-sm focus:outline-none"
            />
          </label>

          {/* Cargo y Fecha */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <label htmlFor="asistencia-area" className="block">
              <span className="text-[14px] font-medium text-slate-700">Cargo / Área</span>
              <input
                id="asistencia-area"
                type="text"
                placeholder="Se completa desde Trabajadores"
                value={data.area}
                autoComplete="off"
                readOnly
                className="mt-1.5 w-full rounded-md border border-gray-200 bg-slate-50 py-2 px-3 text-slate-900 shadow-none sm:text-sm focus:outline-none"
              />
            </label>

            <label htmlFor="asistencia-fecha" className="block relative">
              <span className="text-[14px] font-medium text-slate-700">Fecha <span className="text-red-500">*</span></span>
              <div className="mt-1.5">
                <CustomDatePicker
                  id="asistencia-fecha"
                  type="date"
                  value={data.fecha}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  inputClassName={errors.fecha ? 'border-red-300' : 'border-gray-200'}
                />
              </div>
              {errors.fecha && <p className="mt-1 text-xs text-red-600 absolute -bottom-5 left-0">{errors.fecha}</p>}
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <label htmlFor="asistencia-entrada" className="block relative">
              <span className="text-[14px] font-medium text-slate-700">Hora Entrada</span>
              <input
                id="asistencia-entrada"
                type="time"
                value={data.hora_entrada}
                onChange={(e) => handleChange('hora_entrada', e.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-200 py-2 px-3 text-slate-900 shadow-none sm:text-sm focus:outline-none focus:border-[#00BFA6] focus:ring-1 focus:ring-offset-0 focus:ring-[#00BFA6]"
              />
            </label>
          </div>

          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 mt-4">
            <p className="text-sm font-medium text-emerald-800">El registro manual crea una marcación de ingreso para el trabajador validado.</p>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                Detalles Adicionales
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-500">La información del trabajador se toma directamente del módulo de Trabajadores. Aquí solo se define la fecha y hora de la marcación.</p>
        </div>

        {/* Footer */}
        <footer className="flex justify-end gap-3 border-t border-gray-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-100 bg-white px-8 py-2.5 text-[14px] font-medium text-slate-700 transition-colors hover:bg-gray-50 shadow-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-100 bg-white px-8 py-2.5 text-[14px] font-medium text-[#00BFA6] transition-colors hover:bg-gray-50 shadow-sm disabled:opacity-60"
          >
            {loading && (
              <svg className="size-4 animate-spin text-[#00BFA6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Nuevo'}
          </button>
        </footer>
      </div>
    </div>
  );
}
