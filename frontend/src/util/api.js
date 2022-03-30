const api = (route, opts = {}) => {
    const {params, ...otherOpts} = opts;
    let url = process.env.REACT_APP_API_URL + route;
    if (params) {
        url += '?';
        url += new URLSearchParams(params).toString();
    }
    return fetch(
        url,
        // include credentials by default
        Object.assign({credentials: 'include'}, otherOpts)
    );
};

export default api;