import style from './style.module.scss';
import diamond from '../../icons/diamond.png';
import classNames from 'classnames';

function Diamonds({children, width = 24, inline = false}) {
    return <span className={classNames(style.diamonds, {
        [style.inline]: inline
    })}>
        <img className={style['diamond-icon']} src={diamond} width={width} alt="Diamonds" />
        {children}
    </span>
}

export default Diamonds;
