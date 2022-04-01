import style from './style.module.scss';
import cls from 'classnames';

export function BlueButton(props) {
    return (<button 
            className={cls(style.nftbutton, style.nbb)}
            onClick={props.onClick}
            >
                {props.children}
        </button>);
}
export function WhiteButton(props) {
    return (<button 
            className={cls(style.nftbutton, style.nbw)}
            onClick={props.onClick}
            >
                {props.children}
        </button>);
}