import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from 'react-query';
import TextField from '@material-ui/core/TextField';
import Switch from '@material-ui/core/Switch';

import PropTypes from 'prop-types';
import useStyles from './styles';

const ConfigRow = props => {
  const classes = useStyles();
  const queryClient = useQueryClient();
  const { option } = props;
  const [value, setValue] = useState(option.value);
  const [changed, setChanged] = useState(false);

  const isBool = useMemo(() => {
    let val = option.value;
    val = val === 'true' ? true : val === 'false' ? false : val;
    return typeof val === 'boolean';
  }, [option]);

  const handleChange = event => {
    setValue(event.target.value);
    setChanged(true);
  };

  const handleUpdateBool = event => {
    updateOption(event.target.checked);
  };

  const handleUpdateText = () => {
    if (changed) {
      updateOption(value);
      setChanged(false);
    }
  };

  const updateOption = optionValue => {
    const result = { ...option, value: optionValue };
    axios.put(`/collection/config?id=${option.id}`, result).then(() => {
      queryClient.invalidateQueries(['config']);
    });
  };

  useEffect(() => {
    // init the inputs
    setValue(option.value);
  }, [option]);

  return (
    <div className={classes.option}>
      <div className={classes.optionId}>
        <span className={classes.optionText}>{option.id}</span>
      </div>
      <div className={classes.spacer} />
      {isBool ? (
        <>
          <div className={classes.spacerBool}>{option.display}</div>
          <div className={classes.boolSwitch}>
            <Switch onChange={handleUpdateBool} checked={value} />
          </div>
        </>
      ) : (
        <div className={classes.optionInput}>
          <TextField
            fullWidth
            id="standard-basic"
            label={option.display}
            value={value}
            onChange={handleChange}
            InputProps={{
              classes: {
                input: classes.optionTextField
              },
              onBlur: handleUpdateText
            }}
            InputLabelProps={{
              classes: {
                root: classes.optionTextFieldLabel
              }
            }}
          />
        </div>
      )}
      <div className={classes.spacer} />
    </div>
  );
};

ConfigRow.propTypes = {
  option: PropTypes.object
};
export default ConfigRow;
