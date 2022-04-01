import style from './style.module.scss';

const Modal = ({children, isOpen, onClose}) => {
    if (!isOpen) return null;

    return (
        <>
            <div className={style['modal-bg']} onClick={onClose}/>
            <div className={style['modal-container']}>
                <div className={style['modal']}>
                    {children}
                </div>
            </div>
        </>
    )
};

export default Modal;