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

const Collections = (props) => {
  const { selectedCollection } = props;


  const { data } = useQuery(['collections', { selectedCollection }], () =>
    axios.get(`http://localhost:3000/collection/${selectedCollection}`)
  );

  const getHeaders = () => {
    switch (selectedCollection) {
      case '':
        return [];
      case 'servers':
        return ['ID', 'NAME', 'ENDPOINT', 'TYPE'];
      case 'endpoints':
      case 'plandefinitions':
        return ['ID', { value: 'fullUrl', label: 'FULLURL' }, 'NAME', 'RESOURCE'];
      case 'subscriptions':
        return ['ID', { value: 'fullUrl', label: 'FULLURL' }, 'CRITERIA', 'RESOURCE'];
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
          {getHeaders().map((header, j) => {
            const cellKey = `${i}-${j}`;

            return (
              <TableCell key={cellKey}>
                {' '}
                {header === 'RESOURCE' ? (
                  <ReactJson src={d} collapsed={true} />
                ) : (
                  d[header.value || header.toLowerCase()]
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
      {selectedCollection !== '' && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {getHeaders().map(header => (
                  <TableCell key={header}> {header.label || header} </TableCell>
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
