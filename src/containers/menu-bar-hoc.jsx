import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import React from 'react';
import {
    setCurSubsection,
    getSubsectionList,
    setShowVideo,
} from '../reducers/other';

import { getUserInfo } from '../reducers/user';

const MenuBarHOC = function (WrappedComponent) {
    class MenuBarContainer extends React.PureComponent {
        constructor(props) {
            super(props);

            bindAll(this, [
                'confirmReadyToReplaceProject',
                'shouldSaveBeforeTransition',
            ]);
        }
        componentDidMount() {
            // eslint-disable-next-line react/prop-types
            if (!this.props.userInfo) {
                this.props.getUserInfo();
            }
            if (this.props.subsectionList.length == 0) {
                this.props.getSubsectionList();
            }
        }
        confirmReadyToReplaceProject(message) {
            let readyToReplaceProject = true;
            if (this.props.projectChanged && !this.props.canCreateNew) {
                readyToReplaceProject = this.props.confirmWithMessage(message);
            }
            return readyToReplaceProject;
        }
        shouldSaveBeforeTransition() {
            return this.props.canSave && this.props.projectChanged;
        }
        render() {
            const {
                /* eslint-disable no-unused-vars */
                projectChanged,
                /* eslint-enable no-unused-vars */
                ...props
            } = this.props;
            return (
                <WrappedComponent
                    confirmReadyToReplaceProject={
                        this.confirmReadyToReplaceProject
                    }
                    shouldSaveBeforeTransition={this.shouldSaveBeforeTransition}
                    {...props}
                />
            );
        }
    }

    MenuBarContainer.propTypes = {
        canCreateNew: PropTypes.bool,
        canSave: PropTypes.bool,
        confirmWithMessage: PropTypes.func,
        projectChanged: PropTypes.bool,
    };
    MenuBarContainer.defaultProps = {
        // default to using standard js confirm
        confirmWithMessage: message => confirm(message), // eslint-disable-line no-alert
    };
    const mapStateToProps = state => ({
        projectChanged: state.scratchGui.projectChanged,
        subsectionList: state.scratchGui.other.subsectionList,
        curSubsection: state.scratchGui.other.curSubsection,
        showVideo: state.scratchGui.other.showVideo,
        userInfo: state.scratchGui.user.userInfo,
    });
    const mapDispatchToProps = dispatch => ({
        changeCurSubsection: curSubsection =>
            dispatch(setCurSubsection(curSubsection)),
        getSubsectionList: () => getSubsectionList(dispatch),
        setShowVideo: showVideo => dispatch(setShowVideo(showVideo)),
        getUserInfo: () => getUserInfo(dispatch),
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) =>
        Object.assign({}, stateProps, dispatchProps, ownProps);
    return connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps,
    )(MenuBarContainer);
};

export default MenuBarHOC;
