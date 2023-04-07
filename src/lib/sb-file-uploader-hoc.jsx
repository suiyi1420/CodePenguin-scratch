import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';
import { defineMessages, intlShape, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import log from '../lib/log';
import Box from '../components/box/box.jsx';
import sharedMessages from './shared-messages';
import Modal from '../containers/modal.jsx';
import styles from '../components/connection-modal/connection-modal.css';
// import analytics from '../lib/analytics';

import {
    LoadingStates,
    getIsLoadingUpload,
    getIsShowingWithoutId,
    onLoadedProject,
    requestProjectUpload,
} from '../reducers/project-state';
import { setProjectTitle } from '../reducers/project-title';
import { openLoadingProject, closeLoadingProject } from '../reducers/modals';
import { closeFileMenu } from '../reducers/menus';
import { setSubsectionFile, saveCloudFile } from '../reducers/other';
import { openFileLoadModal, closeFileLoadModal } from '../reducers/modals';
import classNames from 'classnames';

const messages = defineMessages({
    loadError: {
        id: 'gui.projectLoader.loadError',
        defaultMessage: 'The project file that was selected failed to load.',
        description:
            'An error that displays when a local project file fails to load.',
    },
});

/**
 * Higher Order Component to provide behavior for loading local project files into editor.
 * @param {React.Component} WrappedComponent the component to add project file loading functionality to
 * @returns {React.Component} WrappedComponent with project file loading functionality added
 *
 * <SBFileUploaderHOC>
 *     <WrappedComponent />
 * </SBFileUploaderHOC>
 */
const SBFileUploaderHOC = function (WrappedComponent) {
    class SBFileUploaderComponent extends React.Component {
        constructor(props) {
            super(props);
            bindAll(this, [
                'createFileObjects',
                'getProjectTitleFromFilename',
                'handleFinishedLoadingUpload',
                'handleStartSelectingFileUpload',
                'handleChange',
                'onload',
                'removeFileObjects',
                'loadSB3',
                'saveSB3ToCloud',
            ]);
            this.state = {
                origin_file_url: '',
                last_file_url: '',
            };
            this.timer = null;
        }
        componentDidUpdate(prevProps) {
            if (this.props.isLoadingUpload && !prevProps.isLoadingUpload) {
                this.handleFinishedLoadingUpload(); // cue step 5 below
            }

            if (
                this.props.curSubsection !== prevProps.curSubsection ||
                this.props.userInfo !== prevProps.userInfo
            ) {
                if (this.props.curSubsection && this.props.userInfo) {
                    this.initSb3();
                }
            }
            if (this.props.fileLoadModalVisible) {
                clearInterval(this.timer);
            }
        }
        // shouldComponentUpdate(nextProps, nextState) {
        //     return this.props.curSubsection !== nextProps.curSubsection;
        // }
        componentDidMount() {
            //console.log('122222222', this.props);
        }

        componentWillUnmount() {
            console.log('删除');
            this.removeFileObjects();
            clearInterval(this.timer);
        }

        initSb3() {
            this.removeFileObjects();
            console.log('initSb3');
            this.setState({
                origin_file_url: this.props.curSubsection.file_url,
            });
            if (this.props.userInfo && this.props.userInfo.userId !== '') {
                const { userId } = this.props.userInfo;
                const subsection_id = this.props.curSubsection.id;
                const opt = {
                    headers: {
                        Authorization: this.props.token,
                        'Content-Type': 'application/json;charset=UTF-8',
                    },
                    method: 'post',
                    body: JSON.stringify({
                        user_id: userId,
                        subsection_id: subsection_id,
                    }),
                };
                fetch(
                    `${this.props.apiBaseURL}system/subject/subsection/cloud`,
                    opt,
                )
                    .then(resp => resp.json())
                    .then(res => {
                        console.log('cloud', res);
                        if (res.data) {
                            const _this = this;

                            this.setState(
                                { last_file_url: res.data.file_url },
                                () => {
                                    _this.props.openFileLoadModal();
                                },
                            );
                            // url=res.file_url;
                        } else {
                            this.loadSB3(this.props.curSubsection.file_url);
                        }
                    });
            } else {
                //this.loadSB3(this.props.curSubsection.file_url);
            }
        }

        loadSB3(url) {
            const _this = this;
            console.log('即将初始加载Sb3文件');
            let reader = new FileReader();
            let request = new XMLHttpRequest();
            console.log('加载的资源路径', this.props.apiBaseURL + url);
            request.open('GET', this.props.apiBaseURL + url, true);
            request.responseType = 'blob';
            request.onload = function () {
                if (request.status == 404) {
                    alert('未找到sb3类型的资源文件');
                    location.href = '/scratch';
                }
                let blobs = request.response;
                reader.readAsArrayBuffer(blobs);
                reader.onload = () =>
                    _this.props.vm
                        .loadProject(reader.result)
                        .then(() => {
                            // analytics.event({
                            //     category: 'project',
                            //     action: 'Import Project File',
                            //     nonInteraction: true,
                            // });
                            _this.props.onLoadingFinished(
                                _this.props.loadingState,
                            );
                        })
                        .catch(error => {
                            log.warn(error);
                        });
            };
            request.send();
            this.timer = setInterval(() => {
                this.saveSB3ToCloud();
            }, this.props.autoSaveTime);
        }

        saveSB3ToCloud() {
            const _this = this;
            this.props.saveProjectSb3().then(content => {
                const { userInfo, curSubsection, apiBaseURL } = _this.props;

                const fileName =
                    userInfo.userId + '_' + curSubsection.id + '.sb3';
                let file = new File([content], fileName);
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'cloud');
                this.props.saveCloudFile(
                    userInfo.userId,
                    curSubsection.id,
                    apiBaseURL,
                    formData,
                );
            });
        }
        // step 1: this is where the upload process begins
        handleStartSelectingFileUpload() {
            this.createFileObjects(); // go to step 2
        }
        // step 2: create a FileReader and an <input> element, and issue a
        // pseudo-click to it. That will open the file chooser dialog.
        createFileObjects() {
            // redo step 7, in case it got skipped last time and its objects are
            // still in memory
            this.removeFileObjects();
            // create fileReader
            this.fileReader = new FileReader();
            this.fileReader.onload = this.onload;
            // create <input> element and add it to DOM
            this.inputElement = document.createElement('input');
            this.inputElement.accept = '.sb,.sb2,.sb3';
            this.inputElement.style = 'display: none;';
            this.inputElement.type = 'file';
            this.inputElement.onchange = this.handleChange; // connects to step 3
            document.body.appendChild(this.inputElement);
            // simulate a click to open file chooser dialog
            this.inputElement.click();
        }
        // step 3: user has picked a file using the file chooser dialog.
        // We don't actually load the file here, we only decide whether to do so.
        handleChange(e) {
            const {
                intl,
                isShowingWithoutId,
                loadingState,
                projectChanged,
                userOwnsProject,
            } = this.props;
            const thisFileInput = e.target;
            if (thisFileInput.files) {
                // Don't attempt to load if no file was selected
                this.fileToUpload = thisFileInput.files[0];

                // If user owns the project, or user has changed the project,
                // we must confirm with the user that they really intend to
                // replace it. (If they don't own the project and haven't
                // changed it, no need to confirm.)
                let uploadAllowed = true;
                if (userOwnsProject || (projectChanged && isShowingWithoutId)) {
                    uploadAllowed = confirm(
                        // eslint-disable-line no-alert
                        intl.formatMessage(
                            sharedMessages.replaceProjectWarning,
                        ),
                    );
                }
                if (uploadAllowed) {
                    // cues step 4
                    this.props.requestProjectUpload(loadingState);
                } else {
                    // skips ahead to step 7
                    this.removeFileObjects();
                }
                this.props.closeFileMenu();
            }
        }
        // step 4 is below, in mapDispatchToProps

        // step 5: called from componentDidUpdate when project state shows
        // that project data has finished "uploading" into the browser
        handleFinishedLoadingUpload() {
            if (this.fileToUpload && this.fileReader) {
                // begin to read data from the file. When finished,
                // cues step 6 using the reader's onload callback
                this.fileReader.readAsArrayBuffer(this.fileToUpload);
            } else {
                this.props.cancelFileUpload(this.props.loadingState);
                // skip ahead to step 7
                this.removeFileObjects();
            }
        }
        // used in step 6 below
        getProjectTitleFromFilename(fileInputFilename) {
            if (!fileInputFilename) return '';
            // only parse title with valid scratch project extensions
            // (.sb, .sb2, and .sb3)
            const matches = fileInputFilename.match(/^(.*)\.sb[23]?$/);
            if (!matches) return '';
            return matches[1].substring(0, 100); // truncate project title to max 100 chars
        }
        // step 6: attached as a handler on our FileReader object; called when
        // file upload raw data is available in the reader
        onload() {
            if (this.fileReader) {
                this.props.onLoadingStarted();
                const filename = this.fileToUpload && this.fileToUpload.name;
                let loadingSuccess = false;
                this.props.vm
                    .loadProject(this.fileReader.result)
                    .then(() => {
                        if (filename) {
                            const uploadedProjectTitle =
                                this.getProjectTitleFromFilename(filename);
                            this.props.onSetProjectTitle(uploadedProjectTitle);
                        }
                        loadingSuccess = true;
                    })
                    .catch(error => {
                        log.warn(error);
                        alert(
                            this.props.intl.formatMessage(messages.loadError),
                        ); // eslint-disable-line no-alert
                    })
                    .then(() => {
                        this.props.onLoadingFinished(
                            this.props.loadingState,
                            loadingSuccess,
                        );
                        // go back to step 7: whether project loading succeeded
                        // or failed, reset file objects
                        this.removeFileObjects();
                    });
            }
        }
        // step 7: remove the <input> element from the DOM and clear reader and
        // fileToUpload reference, so those objects can be garbage collected
        removeFileObjects() {
            if (this.inputElement) {
                this.inputElement.value = null;
                document.body.removeChild(this.inputElement);
            }
            this.inputElement = null;
            this.fileReader = null;
            this.fileToUpload = null;
        }
        render() {
            const {
                /* eslint-disable no-unused-vars */
                cancelFileUpload,
                fileLoadModalVisible,
                closeFileMenu: closeFileMenuProp,
                isLoadingUpload,
                isShowingWithoutId,
                loadingState,
                onLoadingFinished,
                onLoadingStarted,
                onSetProjectTitle,
                projectChanged,
                requestProjectUpload: requestProjectUploadProp,
                userOwnsProject,
                /* eslint-enable no-unused-vars */
                ...componentProps
            } = this.props;
            console.log('fileLoadModalVisible', fileLoadModalVisible);
            return (
                <React.Fragment>
                    <WrappedComponent
                        onStartSelectingFileUpload={
                            this.handleStartSelectingFileUpload
                        }
                        {...componentProps}
                    >
                        {fileLoadModalVisible ? (
                            <Modal
                                className={styles.modalContent}
                                headerClassName={styles.header}
                                contentLabel={'作品加载'}
                                id="fileLoadModal"
                                onRequestClose={this.props.closeFileLoadModal}
                            >
                                <Box className={styles.body}>
                                    <Box className={styles.activityArea}>
                                        <Box className={styles.centeredRow}>
                                            <div
                                                className={
                                                    styles.peripheralActivity
                                                }
                                            >
                                                是否加载上一次保存的作品？
                                            </div>
                                        </Box>
                                    </Box>
                                    <Box className={styles.bottomArea}>
                                        <div
                                            className={classNames(
                                                styles.bottomAreaItem,
                                                styles.cornerButtons,
                                            )}
                                        >
                                            <button
                                                className={classNames(
                                                    styles.redButton,
                                                    styles.connectionButton,
                                                )}
                                                onClick={() => {
                                                    this.loadSB3(
                                                        this.state
                                                            .last_file_url,
                                                    );
                                                    this.props.closeFileLoadModal();
                                                }}
                                            >
                                                加载
                                            </button>
                                            <button
                                                className={
                                                    styles.connectionButton
                                                }
                                                onClick={() => {
                                                    this.loadSB3(
                                                        this.state
                                                            .origin_file_url,
                                                    );
                                                    this.props.closeFileLoadModal();
                                                }}
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </Box>
                                </Box>
                            </Modal>
                        ) : null}
                    </WrappedComponent>
                </React.Fragment>
            );
        }
    }

    SBFileUploaderComponent.propTypes = {
        canSave: PropTypes.bool,
        cancelFileUpload: PropTypes.func,
        closeFileMenu: PropTypes.func,
        intl: intlShape.isRequired,
        isLoadingUpload: PropTypes.bool,
        isShowingWithoutId: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onLoadingFinished: PropTypes.func,
        onLoadingStarted: PropTypes.func,
        onSetProjectTitle: PropTypes.func,
        projectChanged: PropTypes.bool,
        requestProjectUpload: PropTypes.func,
        userOwnsProject: PropTypes.bool,
        vm: PropTypes.shape({
            loadProject: PropTypes.func,
        }),
        userInfo: PropTypes.object,
        onCancel: PropTypes.func.isRequired,
        apiBaseURL: PropTypes.object,
        token: PropTypes.object,
        fileLoadModalVisible: PropTypes.object,
    };
    const mapStateToProps = (state, ownProps) => {
        const loadingState = state.scratchGui.projectState.loadingState;
        const user =
            state.session &&
            state.session.session &&
            state.session.session.user;
        return {
            isLoadingUpload: getIsLoadingUpload(loadingState),
            isShowingWithoutId: getIsShowingWithoutId(loadingState),
            loadingState: loadingState,
            projectChanged: state.scratchGui.projectChanged,
            fileLoadModalVisible: state.scratchGui.modals.fileLoadModal,
            userOwnsProject:
                ownProps.authorUsername &&
                user &&
                ownProps.authorUsername === user.username,
            vm: state.scratchGui.vm,
            curSubsection: state.scratchGui.other.curSubsection,
            userInfo: state.scratchGui.user.userInfo,
            apiBaseURL: state.scratchGui.other.apiBaseURL,
            token: state.scratchGui.other.token,
            saveProjectSb3: state.scratchGui.vm.saveProjectSb3.bind(
                state.scratchGui.vm,
            ),
            autoSaveTime: state.scratchGui.other.autoSaveTime,
        };
    };
    const mapDispatchToProps = (dispatch, ownProps) => ({
        cancelFileUpload: loadingState =>
            dispatch(onLoadedProject(loadingState, false, false)),
        closeFileMenu: () => dispatch(closeFileMenu()),
        // transition project state from loading to regular, and close
        // loading screen and file menu
        onLoadingFinished: (loadingState, success) => {
            dispatch(onLoadedProject(loadingState, ownProps.canSave, success));
            dispatch(closeLoadingProject());
            dispatch(closeFileMenu());
        },
        // show project loading screen
        onLoadingStarted: () => dispatch(openLoadingProject()),
        onSetProjectTitle: title => dispatch(setProjectTitle(title)),
        // step 4: transition the project state so we're ready to handle the new
        // project data. When this is done, the project state transition will be
        // noticed by componentDidUpdate()
        requestProjectUpload: loadingState =>
            dispatch(requestProjectUpload(loadingState)),
        openFileLoadModal: () => dispatch(openFileLoadModal()),
        closeFileLoadModal: () => dispatch(closeFileLoadModal()),
        setSubsectionFile: () => dispatch(setSubsectionFile()),
        saveCloudFile: (user_id, subsection_id, apiBaseURL, formData) =>
            saveCloudFile(user_id, subsection_id, apiBaseURL, formData),
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) =>
        Object.assign({}, stateProps, dispatchProps, ownProps);
    return injectIntl(
        connect(
            mapStateToProps,
            mapDispatchToProps,
            mergeProps,
        )(SBFileUploaderComponent),
    );
};

export { SBFileUploaderHOC as default };
