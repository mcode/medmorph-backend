import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TablePagination
} from '@material-ui/core';
import ReactJson from 'react-json-view';
import PropTypes from 'prop-types';
import useStyles from './styles';
import SortedTableHead from './SortedTableHead';
import DeleteIcon from '@material-ui/icons/Delete';
import CreateIcon from '@material-ui/icons/Create';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';

const Collections = props => {
  const classes = useStyles();
  const { selectedCollection } = props;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('');

  useEffect(() => {
    setPage(0);
  }, selectedCollection);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  });

  function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  }

  function serverStatus(server) {
    return server && true;
  }

  function getComparator(order, orderBy) {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);

    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map(el => el[0]);
  }

  const handleRequestSort = useCallback((event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  });

  const handleChangeRowsPerPage = useCallback(event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  });

  const { data } = useQuery(['collections', { selectedCollection }], () =>
    axios.get(`/collection/${selectedCollection}`)
  );

  const getInfo = () => {
    let headers = [];
    switch (selectedCollection) {
      case '':
        return [];
      case 'servers':
        headers = [{ value: 'icon', label: '' }, 'name', 'id', 'endpoint', 'type'];
        return {
          headers,
          data: data.data.map(element => {
            const icon = serverStatus(element) ? classes.greenIcon : classes.redIcon;
            element.icon = <a className={icon}></a>;
            return element;
          }),
          addButton: true
        };
      case 'endpoints':
      case 'plandefinitions':
        headers = ['id', 'fullUrl', 'name', 'resource'];
        return {
          headers,
          data: data.data,
          addButton: true
        };
      case 'subscriptions':
        headers = ['id', 'fullUrl', 'criteria', 'resource'];
        return {
          headers,
          data: data.data,
          addButton: true
        };
      case 'logs':
        headers = ['id', 'timestamp', 'message', 'location'];
        return {
          headers,
          data: data.data,
          addButton: false
        };
      default:
        headers = ['id', 'resource'];
        return {
          headers,
          data: data.data,
          addButton: false
        };
    }
  };

  const infoBundle = data ? getInfo() : { headers: [], data: [], addButton: true };

  const formatRows = () => {
    if (!infoBundle.data) return [];
    return stableSort(infoBundle.data, getComparator(order, orderBy))
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      .map((d, i) => {
        return (
          <TableRow key={`${selectedCollection}-${i}`} classes={{ root: classes.tableRow }}>
            {infoBundle.headers.map((header, j) => {
              const cellKey = `${i}-${j}`;
              return (
                <TableCell key={cellKey} style={{ whiteSpace: 'nowrap' }}>
                  {' '}
                  {header === 'resource' ? (
                    <ReactJson src={d} collapsed={true} enableClipboard={false} />
                  ) : (
                    d[header.value || header.toLowerCase()]
                  )}{' '}
                </TableCell>
              );
            })}
            <TableCell>
              <CreateIcon fontSize={'small'} color="secondary" classes={{ root: classes.icon }} />
              <DeleteIcon fontSize={'small'} color="error" classes={{ root: classes.icon }} />
            </TableCell>
          </TableRow>
        );
      });
  };

  const renderToolbar = () => {
    return (
      <>
        <div className={classes.topBar}>
          <span className={classes.topBarText}>{selectedCollection.toUpperCase()}</span>
          {infoBundle.addButton && (
            <Button
              variant="contained"
              classes={{ root: classes.addButton }}
              color="secondary"
              disableElevation
              startIcon={<AddIcon />}
            >
              Add new
            </Button>
          )}
        </div>
        <div className={classes.break}></div>
      </>
    );
  };

  return (
    <div className={classes.collection}>
      {selectedCollection !== '' && infoBundle.data && (
        <>
          {renderToolbar()}
          {infoBundle.data.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <SortedTableHead
                  classes={classes}
                  order={order}
                  orderBy={orderBy}
                  onRequestSort={handleRequestSort}
                  headers={infoBundle.headers}
                />
                <TableBody>{formatRows()}</TableBody>
              </Table>
              <TablePagination
                component="div"
                count={infoBundle.data.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onChangePage={handleChangePage}
                backIconButtonProps={{
                  classes: classes.backButton
                }}
                onChangeRowsPerPage={handleChangeRowsPerPage}
              />
            </TableContainer>
          ) : (
            <div className={classes.noData}>No Data Found</div>
          )}
        </>
      )}
    </div>
  );
};

Collections.propTypes = {
  selectedCollection: PropTypes.string
};
export default Collections;
