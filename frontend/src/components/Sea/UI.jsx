import style from './style.module.scss';
import cls from 'classnames';

export function BlueButton(props) {
    return (<button 
            className={cls(style.ui, style.nftbutton, style.nbb, props.className)}
            onClick={props.onClick}
            disabled={!!props.disabled}
            >
                {props.children}
        </button>);
}
export function WhiteButton(props) {
    return (<button 
            className={cls(style.ui, style.nftbutton, style.nbw, props.className)}
            onClick={props.onClick}
            disabled={!!props.disabled}
            >
                {props.children}
        </button>);
}

export function Dropdown(props) {
    return (<select {...props} className={cls(style.ui, props.className)} />)
}

export function Input(props) {
    return (<input {...props} className={cls(style.ui, props.className)} />)
}