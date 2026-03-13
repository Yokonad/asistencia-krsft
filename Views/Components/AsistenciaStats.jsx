import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

function StatCard({ title, value, icon, iconBg, iconColor }) {
  return (
    <article className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4">
      <span className={`rounded-full p-2.5 ${iconBg} ${iconColor}`}>
        {icon}
      </span>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{title}</p>
      </div>
    </article>
  );
}

export default function AsistenciaStats({ total, presentes, ausentes, hoy }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Registros"
        value={total}
        icon={<ClipboardDocumentListIcon className="size-4" />}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
      />
      <StatCard
        title="Presentes"
        value={presentes}
        icon={<CheckCircleIcon className="size-4" />}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
      />
      <StatCard
        title="Ausentes"
        value={ausentes}
        icon={<XCircleIcon className="size-4" />}
        iconBg="bg-red-100"
        iconColor="text-red-600"
      />
      <StatCard
        title="Registros Hoy"
        value={hoy}
        icon={<CalendarDaysIcon className="size-4" />}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
      />
    </section>
  );
}
