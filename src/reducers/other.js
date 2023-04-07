const CHANGE_SUBJECT = 'scratch-gui/subject/change';
const CHANGE_CURSUBSECTION = 'scratch-gui/cursubject/change';
const CHANGE_SUBSECTIONFILE = 'scratch-gui/subsectionfile/change';
const CHANGE_FILE_URL = 'scratch-gui/fileurl/change';
const CHANGE_AUTO_SAVE_TIME = 'scratch-gui/auto_save_time/change';

const initialState = {
    subsectionList: [],
    subsectionFile: null,
    curSubsection: null,
    showVideo: true,
    userWeb: '',
    apiBaseURL: '/api/',
    apiWeb: '/admin',
    token: '',
    file_url: '',
    autoSaveTime: 30000,
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    // console.log('action', action.payload);
    switch (action.type) {
        default:
            return {
                ...state,
                ...action.payload,
            };
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
const setSubsectionFile = function (subsectionFile) {
    return {
        type: CHANGE_SUBSECTIONFILE,
        payload: { subsectionFile: subsectionFile },
    };
};
const setShowVideo = function (showVideo) {
    return {
        type: CHANGE_CURSUBSECTION,
        payload: { showVideo: !showVideo },
    };
};
const setConfig = function (userWeb, apiBaseURL, apiWeb, access, autoSaveTime) {
    return {
        type: CHANGE_CURSUBSECTION,
        payload: {
            userWeb: userWeb,
            apiBaseURL: apiBaseURL,
            apiWeb: apiWeb,
            token: access,
            autoSaveTime,
            autoSaveTime,
        },
    };
};
const setfileUrl = function (file_url) {
    return {
        type: CHANGE_FILE_URL,
        payload: {
            file_url: file_url,
        },
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
            dispatch(
                setConfig(
                    res.userWeb,
                    res.apiBaseURL,
                    res.apiWeb,
                    access,
                    res.autoSaveTime,
                ),
            );
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
                    dispatch(setSubsectionList(resp2.data));

                    if (resp2.data.length > 0) {
                        dispatch(setCurSubsection(resp2.data[0]));
                        if (
                            resp2.data[0].video_url &&
                            resp2.data[0].video_url !== ''
                        ) {
                            dispatch(setShowVideo(true));
                        }
                    }
                });
        });
};
//保存至云端
const saveCloudFile = (user_id, subsection_id, apiBaseURL, formData) => {
    const param = new URLSearchParams(window.location.search);
    const access = param.get('access');
    const token = 'Bearer ' + access;

    fetch(`${apiBaseURL}system/user/profile/common_upload`, {
        headers: {
            Authorization: token,
        },
        method: 'post',
        body: formData,
    })
        .then(resp => resp.json())
        .then(res => {
            console.log('保存至云端', res);
            if (res.code == 200 || res.code == '200') {
                const url = res.url;
                const obj = {
                    user_id: user_id,
                    subsection_id: subsection_id,
                    file_url: url,
                };
                fetch(`${apiBaseURL}system/subject/subsection/cloud/update`, {
                    headers: {
                        Authorization: token,
                        'Content-Type': 'application/json;charset=UTF-8',
                    },
                    method: 'post',
                    body: JSON.stringify(obj),
                })
                    .then(resp => resp.json())
                    .then(res => {
                        console.log('保存至云端2', res);
                    });
            }
        });
};

export {
    reducer as default,
    initialState as otherInitialState,
    getSubsectionList,
    setShowVideo,
    setCurSubsection,
    saveCloudFile,
    setSubsectionFile,
    setfileUrl,
};
