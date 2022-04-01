function setDiamonds(diamonds) {
    return {
        type: 'SET_DIAMONDS',
        diamonds
    }
}

const diamondsReducer = (state, action) => {
    if (action.type === 'SET_DIAMONDS') {
        return {...state, diamonds: action.diamonds};
    }
    return state;
}

export {setDiamonds, diamondsReducer};
