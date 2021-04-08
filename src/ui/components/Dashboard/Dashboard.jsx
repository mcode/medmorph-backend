import React, { useState, memo, useCallback, useRef } from 'react';
import {
  Button,
  FormControl,
  Input,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar
} from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';
import useStyles from './styles';
import usePlanDefinitions from '../../hooks/usePlanDefinitions';
import axios from 'axios';

function Dashboard() {
  const classes = useStyles();
  const importFileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('');
  const [planDefFullUrl, setPlanDefFullUrl] = useState('');
  const { data: planDefinitions } = usePlanDefinitions();

  const handleChangePlanDefFullUrl = useCallback(
    event => {
      setPlanDefFullUrl(event.target.value);
    },
    [setPlanDefFullUrl]
  );

  const handleChooseFile = useCallback(() => {
    if (importFileRef?.current?.files?.[0]) setFileName(importFileRef.current.files[0].name);
  }, [importFileRef, setFileName]);

  const handleTrigger = useCallback(
    event => {
      event.preventDefault();
      setIsLoading(true);
      const files = importFileRef.current.files;
      const reader = new global.FileReader();
      reader.onload = e => {
        const rawContent = e.target.result;
        const resource = JSON.parse(rawContent);
        axios
          .post('/index/trigger', { planDefFullUrl, resource }, { withCredentials: true })
          .then(() => {
            setIsLoading(false);
            setFileName('');
            setPlanDefFullUrl('');
            setAlert('Manual Report Triggered Successfully!', 'success');
          })
          .catch(err => {
            console.error(err);
            setAlert('Error Triggering Report Manually. Please Try Again.', 'error');
          });
      };
      reader.readAsText(files[0]);
    },
    [planDefFullUrl, setFileName, setIsLoading, setPlanDefFullUrl]
  );

  const handleCloseAlert = useCallback(() => {
    setAlertMessage('');
    setAlertSeverity('');
  }, [setAlertMessage, setAlertSeverity]);

  const setAlert = useCallback(
    (message, severity) => {
      setAlertMessage(message);
      setAlertSeverity(severity);
    },
    [setAlertMessage, setAlertSeverity]
  );

  return (
    <div className={classes.dashboardContainer}>
      <Paper elevation={3} className={classes.dashboardCard}>
        <p>Manually Trigger Notification</p>
        <form onSubmit={handleTrigger}>
          <FormControl variant="outlined" className={classes.fullWidth}>
            <InputLabel>Plan Definition</InputLabel>
            <Select
              label="Plan Definition"
              value={planDefFullUrl}
              onChange={handleChangePlanDefFullUrl}
              className={classes.fullWidth}
            >
              {planDefinitions &&
                planDefinitions.map(planDef => (
                  <MenuItem key={planDef.fullUrl} value={planDef.fullUrl}>
                    {planDef.title} ({planDef.fullUrl})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <div id="resource-upload-container" className={classes.chooseFileInput}>
            <Input
              id="choose-file-input"
              className={classes.input}
              inputRef={importFileRef}
              type="file"
              inputProps={{ accept: '.json' }}
              onChange={handleChooseFile}
            />
            <label htmlFor="choose-file-input">
              <Button
                className={classes.inputButton}
                variant="container"
                color="primary"
                component="span"
              >
                Choose Patient/Encounter
              </Button>
            </label>
            <div className={classes.fileName}>
              {fileName ? <span>{fileName}</span> : <span>Choose file to import</span>}
            </div>
          </div>
          <Button
            variant="contained"
            color="secondary"
            type="submit"
            disabled={isLoading}
            disableElevation
          >
            Trigger
          </Button>
        </form>
      </Paper>

      <Snackbar
        open={alertMessage}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={handleCloseAlert}
          severity={alertSeverity}
        >
          {alertMessage}
        </MuiAlert>
      </Snackbar>
    </div>
  );
}

export default memo(Dashboard);
