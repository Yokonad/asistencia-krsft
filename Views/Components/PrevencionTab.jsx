import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

export default function PrevencionTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-full bg-amber-50 p-5 mb-5">
        <WrenchScrewdriverIcon className="size-10 text-amber-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Actualización Posterior</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-sm text-center">
        Este módulo se encuentra en desarrollo y estará disponible en una próxima actualización.
      </p>
      <span className="mt-4 inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
        Próximamente
      </span>
    </div>
  );
}
