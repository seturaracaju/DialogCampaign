import React from 'react';
import Modal from './Modal';

// Fix: Made children prop optional to resolve incorrect TypeScript errors.
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting, children, title = "Confirmar Exclusão" }: { isOpen: boolean, onClose: () => void, onConfirm: () => void | Promise<void>, isDeleting: boolean, children?: React.ReactNode, title?: string }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        {children}
        <div className="flex justify-end gap-4 pt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600">Cancelar</button>
            <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? 'Excluindo...' : 'Excluir'}
            </button>
        </div>
    </Modal>
);

export default DeleteConfirmModal;