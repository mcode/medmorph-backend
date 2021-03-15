import React, { useState } from 'react';
import Select from 'react-select';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@material-ui/core';
import ResourceCell from './ResourceCell';

const Collections = () => {
  const [data, setData] = useState({ collectionName: '', headers: [], data: [] });
  const collections = [
    { value: 'servers', label: 'Servers' },
    { value: 'endpoints', label: 'Endpoints' },
    { value: 'subscriptions', label: 'Subscriptions' },
    { value: 'plandefinitions', label: 'PlanDefinitions' },
    { value: 'logs', label: 'Logs' }
  ];

  const onSelect = selectedOption => {
    axios.get(`http://localhost:3000/${selectedOption.value}`).then(response => {
      setData({
        collectionName: selectedOption.value,
        headers: getHeaders(selectedOption.value),
        data: response.data
      });
    });
  };

  const getHeaders = collectionName => {
    switch (collectionName) {
      case 'servers':
        return ['ID', 'NAME', 'ENDPOINT', 'TYPE'];
      case 'endpoints':
        return ['ID', 'NAME', 'RESOURCE'];
      case 'subscriptions':
        return ['ID', 'CRITERIA', 'RESOURCE'];
      case 'plandefinitions':
        return ['ID', 'NAME', 'RESOURCE'];
      case 'logs':
        return ['ID', 'TIMESTAMP', 'MESSAGE', 'LOCATION'];
    }
  };

  const formatRows = () => {
    const { collectionName, headers } = data;

    return data.data.map((d, i) => {
      return (
        <TableRow key={`${collectionName}-${i}`}>
          {headers.map((h, j) => {
            const cellKey = `${i}-${j}`;
            if (h === 'RESOURCE') return <ResourceCell cellKey={cellKey} resource={d} />;

            return <TableCell key={cellKey}> {d[h.toLowerCase()]} </TableCell>;
          })}
        </TableRow>
      );
    });
  };

  return (
    <div>
      <Select options={collections} onChange={onSelect} />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {data.headers.map(header => (
                <TableCell key={header}> {header} </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{formatRows()}</TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Collections;
