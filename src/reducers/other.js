const CHANGE_SUBJECT = 'scratch-gui/subject/change';
const CHANGE_CURSUBSECTION = 'scratch-gui/cursubject/change';

const initialState = {
    subsectionList: [],
    curSubsection: null,
    showVideo: true,
    userWeb: '',
    apiBaseURL: 'http://localhost:8000/api/',
    apiWeb: 'http://localhost:8000/user/login',
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    // console.log('action', action.payload);
    switch (action.type) {
        case CHANGE_SUBJECT:
            return {
                ...state,
                ...action.payload,
            }; // intended to show standard and inline alerts, but not extensions
        case CHANGE_CURSUBSECTION:
            return {
                ...state,
                ...action.payload,
            };
        default:
            return state;
    }
};
const setSubsectionList = function (subsectionList) {
    return {
        type: CHANGE_SUBJECT,
        payload: { subsectionList: subsectionList },
    };
};
const setCurSubsection = function (curSubsection) {
    return {
        type: CHANGE_CURSUBSECTION,
        payload: { curSubsection: curSubsection },
    };
};
const setShowVideo = function (showVideo) {
    return {
        type: CHANGE_CURSUBSECTION,
        payload: { showVideo: !showVideo },
    };
};
const setConfig = function (userWeb, apiBaseURL, apiWeb) {
    return {
        type: CHANGE_CURSUBSECTION,
        payload: { userWeb: userWeb, apiBaseURL: apiBaseURL, apiWeb: apiWeb },
    };
};
const getSubsectionList = dispatch => {
    const param = new URLSearchParams(window.location.search);
    // eslint-disable-next-line camelcase
    const subject_info_id = param.get('subject_info_id');
    const access = param.get('access');
    const token = 'Bearer ' + access;
    fetch(`static/config.json`)
        .then(resp => resp.json())
        .then(res => {
            dispatch(setConfig(res.userWeb, res.apiBaseURL, res.apiWeb));
            localStorage.setItem('userWeb', res.userWeb);
            localStorage.setItem('apiBaseURL', res.apiBaseURL);
            localStorage.setItem('apiWeb', res.apiWeb);
            const opt = {
                headers: { Authorization: token },
                method: 'post',
            };
            fetch(
                res.apiBaseURL +
                    'system/class/list/subject/subsection/' +
                    subject_info_id,
                opt,
            )
                .then(resp1 => resp1.json())
                .then(resp2 => {
                    console.log('res', resp2);
                    dispatch(setSubsectionList(resp2.rows));

                    if (resp2.rows.length > 0) {
                        dispatch(setCurSubsection(resp2.rows[0]));
                    }
                });
        });
};

export {
    reducer as default,
    initialState as otherInitialState,
    getSubsectionList,
    setShowVideo,
    setCurSubsection,
};
