import React from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';

import useStyles from './styles';
import ConfigRow from './ConfigRow';

const Config = () => {
  const classes = useStyles();

  const { data } = useQuery(['config'], () => axios.get(`/collection/config`));

  return (
    <div className={classes.collection}>
      <div className={classes.topBar}>
        <span className={classes.topBarText}>{'Configuration'}</span>
      </div>
      <div className={classes.break}></div>

      {data?.data.map(option => {
        return <ConfigRow key={option.id} option={option} />;
      })}
    </div>
  );
};

export default Config;
