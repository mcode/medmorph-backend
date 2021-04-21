import React, { useCallback } from 'react';
import axios from 'axios';
import { useQueryClient } from 'react-query';

import PropTypes from 'prop-types';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import HistoryIcon from '@material-ui/icons/History';
import DoneIcon from '@material-ui/icons/Done';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import useStyles from './styles';

const Notifications = props => {
  const classes = useStyles();
  const queryClient = useQueryClient();

  const { notifs } = props;
  const updateNotif = useCallback(notif => {
    return () => {
      notif.viewed = true;
      axios.put(`/collection/notifications?id=${notif.id}`, notif).then(() => {
        queryClient.invalidateQueries('notifications');
      });
    };
  });

  const getElapsed = time => {
    const now = Date.now();
    const diff = now - time;
    const diffInSeconds = diff / 1000;
    if (diffInSeconds >= 60) {
      const diffInMinutes = diffInSeconds / 60;
      if (diffInMinutes >= 60) {
        const diffInHours = diffInMinutes / 60;
        if (diffInHours >= 24) {
          const diffInDays = diffInHours / 24;
          if (diffInDays >= 365) {
            const diffInYears = Math.floor(diffInDays / 365);
            if (diffInYears === 1) {
              return `${diffInYears} year ago`;
            } else {
              return `${diffInYears} years ago`;
            }
          } else {
            const realDiff = Math.floor(diffInDays);
            if (realDiff === 1) {
              return `${realDiff} day ago`;
            } else {
              return `${realDiff} days ago`;
            }
          }
        } else {
          const realDiff = Math.floor(diffInHours);
          if (realDiff === 1) {
            return `${realDiff} hr ago`;
          } else {
            return `${realDiff} hrs ago`;
          }
        }
      } else {
        const realDiff = Math.floor(diffInMinutes);
        if (realDiff === 1) {
          return `${realDiff} min ago`;
        } else {
          return `${realDiff} mins ago`;
        }
      }
    } else {
      const realDiff = Math.floor(diffInSeconds);
      if (realDiff === 1) {
        return `${realDiff} second ago`;
      } else {
        return `${realDiff} seconds ago`;
      }
    }
  };

  return (
    <div className={classes.collection}>
      {notifs.length > 0 ? (
        notifs.map(notif => {
          return (
            <div key={notif.id} className={classes.notificationCard}>
              <ErrorOutlineIcon fontSize="large" className={classes.errorIcon} />
              <div className={classes.notificationSection}>Error Recieved:</div>
              <div className={`${classes.notificationSection} ${classes.notificationContent}`}>
                <div className={classes.content}>{notif.notif}</div>
              </div>
              <HistoryIcon fontSize="large" className={classes.historyIcon} />
              <div className={classes.timestamp}>{getElapsed(notif.timestamp)}</div>
              <DoneIcon
                className={classes.doneIcon}
                fontSize="large"
                onClick={updateNotif(notif)}
              />
              <OpenInNewIcon className={classes.openIcon} color="secondary" fontSize="large" />
            </div>
          );
        })
      ) : (
        <div className={classes.collection}>
          <div className={classes.notificationCard}>No New Notifications</div>
        </div>
      )}
    </div>
  );
};

Notifications.propTypes = {
  notifs: PropTypes.array
};
export default Notifications;
