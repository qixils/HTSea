function setError(error) {
    return {
        type: 'SET_ERROR',
        error
    }
}

const errorReducer = (state, action) => {
    if (action.type === 'SET_ERROR') {
        return {...state, error: action.error};
    }
    return state;
}

export {setError, errorReducer};
