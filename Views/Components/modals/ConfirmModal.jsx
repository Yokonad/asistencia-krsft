import { memo } from 'react';
import { ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * ConfirmModal – Generic confirmation dialog (HyperUI style).
 * Uses cecoskrsft Modal API (isOpen instead of open).
 */
function ConfirmModal({
    isOpen,
    onClose,
    title,
    message,
    actionLabel = 'Aceptar',
    actionVariant = 'danger',
    processing = false,
    onConfirm,
}) {
    const isDanger = actionVariant === 'danger';
    const resolvedVariant = isDanger ? 'danger' : 'primary';
    const Icon = isDanger ? ExclamationTriangleIcon : QuestionMarkCircleIcon;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <div className="text-center px-6 py-8">
                <div className={`mx-auto mb-5 flex size-16 items-center justify-center rounded-full ${
                    isDanger ? 'bg-red-50 text-red-500' : 'bg-[#e5fcf5] text-[#00BFA6]'
                }`}>
                    <Icon className="size-8" />
                </div>

                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <p className="mt-3 text-[15px] font-medium text-gray-500 leading-relaxed text-balance">{message}</p>

                <footer className="mt-8 flex gap-3">
                    <button 
                      type="button" 
                      onClick={onClose} 
                      disabled={processing} 
                      className="flex-1 rounded-md bg-gray-100 hover:bg-gray-200 py-2.5 text-[14px] font-semibold text-gray-600 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                      type="button" 
                      onClick={onConfirm} 
                      disabled={processing} 
                      className={`flex-1 rounded-md py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors text-center inline-flex justify-center items-center gap-2 ${
                        isDanger ? 'bg-[#EF4444] hover:bg-red-600' : 'bg-[#00BFA6] hover:bg-[#00a38d]'
                      }`}
                    >
                        {processing ? '...' : (
                            <>
                                {!isDanger && <Icon className="size-4" />}
                                {actionLabel}
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </Modal>
    );
}

export default memo(ConfirmModal);
