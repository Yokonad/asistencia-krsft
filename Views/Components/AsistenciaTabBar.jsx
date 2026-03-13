import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  UsersIcon,
  FolderOpenIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

export default function AsistenciaTabBar({ counts, activeTab, setActiveTab }) {
  const tabs = [
    {
      key: 'hoy',
      label: 'HOY',
      count: counts?.hoy || 0,
      icon: CalendarDaysIcon,
      activeColor: 'border-emerald-500',
      textActiveColor: 'text-emerald-600',
    },
    {
      key: 'asistencias',
      label: 'ASISTENCIAS',
      count: counts?.total || 0,
      icon: ClipboardDocumentListIcon,
      activeColor: 'border-blue-500',
      textActiveColor: 'text-blue-600',
    },
    {
      key: 'prevencion',
      label: 'PREVENCIÓN',
      count: counts?.prevencion || 0,
      icon: ShieldCheckIcon,
      activeColor: 'border-amber-500',
      textActiveColor: 'text-amber-600',
    },
    {
      key: 'personas',
      label: 'PERSONAS',
      count: counts?.personas || 0,
      icon: UsersIcon,
      activeColor: 'border-purple-500',
      textActiveColor: 'text-purple-600',
    },
    {
      key: 'proyectos',
      label: 'PROYECTOS',
      count: counts?.proyectos || 0,
      icon: FolderOpenIcon,
      activeColor: 'border-indigo-500',
      textActiveColor: 'text-indigo-600',
    },
  ];

  // Si no se pasa activeTab, asumimos 'hoy' por defecto o el primero
  const currentActive = activeTab || 'hoy';

  return (
    <div className="flex flex-wrap gap-6 border-b border-gray-200 mt-6" role="tablist" aria-label="Secciones de asistencia">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentActive === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab && setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-1 py-3 text-xs font-semibold tracking-wide transition-colors border-b-2 -mb-[1px] ${
              isActive
                ? `${tab.activeColor} ${tab.textActiveColor}`
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isActive ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
