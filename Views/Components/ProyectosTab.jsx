import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FolderOpenIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

export default function ProyectosTab({ onCountChange }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/asistenciakrsft/proyectos');
      const result = await response.json();
      if (result.success) {
        setProjects(result.data || []);
        setError(null);
      } else {
        setError(result.message || 'Error al cargar proyectos');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    onCountChange?.(projects.length);
  }, [projects.length, onCountChange]);

  const filtered = useMemo(() => {
    if (!search) return projects;
    const term = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.abbreviation || '').toLowerCase().includes(term) ||
        p.trabajadores?.some(
          (t) =>
            (t.nombre_completo || '').toLowerCase().includes(term) ||
            (t.dni || '').includes(term)
        )
    );
  }, [projects, search]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded border border-gray-300 bg-white shadow-sm">
        <svg className="size-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando proyectos...</p>
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
      {/* Buscador */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proyecto o trabajador..."
          className="block w-full rounded border border-gray-100 py-2 pl-9 text-gray-900 placeholder:text-gray-400 focus:border-[#00BFA6] focus:ring-1 focus:ring-[#00BFA6] text-xs shadow-sm"
        />
      </div>

      <p className="text-sm text-gray-500">{filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}</p>

      {/* Lista de Proyectos */}
      <div className="space-y-4">
        {filtered.map((project) => {
          const isExpanded = expandedId === project.id;
          return (
            <div key={project.id} className="rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Cabecera del proyecto */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : project.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${project.status === 'active' ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                    <FolderOpenIcon className={`size-5 ${project.status === 'active' ? 'text-indigo-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-gray-800 uppercase">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {project.abbreviation && (
                        <p className="text-[11px] text-gray-400">{project.abbreviation}</p>
                      )}
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        project.status === 'active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {project.etapa}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Mini stats */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                      <UsersIcon className="size-3.5" />
                      {project.total_trabajadores}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircleIcon className="size-3.5" />
                      {project.presentes_hoy}
                    </span>
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <XCircleIcon className="size-3.5" />
                      {project.ausentes_hoy}
                    </span>
                  </div>
                  {isExpanded
                    ? <ChevronUpIcon className="size-4 text-gray-400" />
                    : <ChevronDownIcon className="size-4 text-gray-400" />
                  }
                </div>
              </button>

              {/* Trabajadores expandidos */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {project.trabajadores.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-gray-400">No hay trabajadores asignados a este proyecto.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {project.trabajadores.map((t) => (
                        <div key={t.trabajador_id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-[13px] font-bold text-gray-800 uppercase">{t.nombre_completo}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">DNI: {t.dni} · {t.cargo || 'Sin cargo'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.presente_hoy ? (
                              <>
                                <span className="text-xs font-bold text-emerald-600">{t.hora_entrada}</span>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                  Presente
                                </span>
                              </>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
                                Sin registro
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 rounded border border-gray-300 bg-white shadow-sm">
            <p className="text-sm text-gray-500">No se encontraron proyectos activos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
