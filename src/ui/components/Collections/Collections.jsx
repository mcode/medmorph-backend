import React, { useState } from 'react';
import Select from 'react-select';
import axios from 'axios';
import { useQuery } from 'react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@material-ui/core';
import ReactJson from 'react-json-view';

const Collections = () => {
  const [selectedCollection, setSelectedCollection] = useState('');
  const collections = [
    { value: 'servers', label: 'Servers' },
    { value: 'endpoints', label: 'Endpoints' },
    { value: 'subscriptions', label: 'Subscriptions' },
    { value: 'plandefinitions', label: 'PlanDefinitions' },
    { value: 'reporting', label: 'Reporting' },
    { value: 'completedreports', label: 'Completed Reports' },
    { value: 'logs', label: 'Logs' },
    { value: 'errors', label: 'Errors' },
    { value: 'messages', label: 'Messages' },
    { value: 'requests', label: 'Requests' }
  ];

  const { data } = useQuery(['collections', { selectedCollection }], () =>
    axios.get(`http://localhost:3000/${selectedCollection}`)
  );

  const getHeaders = () => {
    switch (selectedCollection) {
      case '':
        return [];
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
      default:
        return ['ID', 'RESOURCE'];
    }
  };

  const formatRows = () => {
    if (!data) return [];
    return data.data.map((d, i) => {
      return (
        <TableRow key={`${selectedCollection}-${i}`}>
          {getHeaders().map((h, j) => {
            const cellKey = `${i}-${j}`;

            return (
              <TableCell key={cellKey}>
                {' '}
                {h === 'RESOURCE' ? (
                  <ReactJson src={d} collapsed={true} />
                ) : (
                  d[h.toLowerCase()]
                )}{' '}
              </TableCell>
            );
          })}
        </TableRow>
      );
    });
  };

  return (
    <div>
      <Select options={collections} onChange={e => setSelectedCollection(e.value)} />
      {selectedCollection !== '' && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {getHeaders().map(header => (
                  <TableCell key={header}> {header} </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>{formatRows()}</TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

export default Collections;
