import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';
import { Table, TableBody, TableContainer, TablePagination } from '@material-ui/core';
import PropTypes from 'prop-types';
import useStyles from './styles';
import SortedTableHead from './SortedTableHead';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import CollectionRow from './CollectionRow';
import { v4 } from 'uuid';

const Collections = props => {
  const classes = useStyles();

  const { selectedCollection } = props;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('');
  const [addNew, setAddNew] = useState(false);
  useEffect(() => {
    setPage(0);
    setAddNew(false);
  }, [selectedCollection]);

  const handleChangePage = useCallback(
    (event, newPage) => {
      setPage(newPage);
    },
    [setPage]
  );

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

  const createNew = () => {
    setAddNew(true);
  };

  const endNew = () => {
    setAddNew(false);
  };

  const { data } = useQuery(['collections', { selectedCollection }], () =>
    axios.get(`/collection/${selectedCollection}`)
  );

  const getInfo = () => {
    let headers = [];
    switch (selectedCollection) {
      case '':
        return [];
      case 'servers':
        headers = [
          { value: 'icon', label: '', edit: false, viewOnly: true },
          { value: 'name', label: 'name', edit: true },
          { value: 'id', label: 'id', edit: false },
          { value: 'endpoint', label: 'endpoint', edit: true },
          { value: 'type', label: 'type', edit: false },
          { value: 'clientId', label: 'clientId', edit: true },
          { value: 'secret', label: 'secret', edit: true },
          // NOTE: secret is only used for client_secret_basic auth.
          // see src/utils/client.js : connectToServer for more info
          { value: 'customScopes', label: 'customScopes', edit: true }
        ];
        return {
          headers,
          data: data.data.map(element => {
            const icon = serverStatus(element) ? classes.greenIcon : classes.redIcon;
            element.icon = <a className={icon}></a>;
            return element;
          }),
          addButton: true,
          editable: true
        };
      case 'config':
        headers = [
          { value: 'id', label: 'id', edit: false },
          { value: 'value', label: 'Value', edit: true }
        ];
        return {
          headers,
          data: data.data,
          addButton: false,
          editable: true,
          noDelete: true
        };
      case 'endpoints':
      case 'plandefinitions':
        headers = [
          { value: 'id', label: 'id', edit: false },
          { value: 'fullUrl', label: 'fullUrl', edit: true, required: true },
          { value: 'name', label: 'name', edit: false, viewOnly: true },
          { value: 'resource', label: 'resource', edit: true }
        ];
        return {
          headers,
          data: data.data,
          addButton: true,
          editable: true
        };
      case 'subscriptions':
        headers = [
          { value: 'id', label: 'id', edit: false },
          { value: 'fullUrl', label: 'fullUrl', edit: true, required: true },
          { value: 'criteria', label: 'criteria', edit: false, viewOnly: true },
          { value: 'server', label: 'location', edit: false },
          { value: 'timestamp', label: 'last updated', edit: false, viewOnly: true },
          { value: 'resource', label: 'resource', edit: true }
        ];
        return {
          headers,
          data: data.data,
          addButton: true,
          editable: true
        };
      case 'logs':
        headers = [
          { value: 'id', label: 'id', edit: false },
          { value: 'timestamp', label: 'timestamp', edit: false },
          { value: 'message', label: 'message', edit: false },
          { value: 'location', label: 'location', edit: false }
        ];
        return {
          headers,
          data: data.data,
          addButton: false,
          editable: false
        };
      default:
        headers = [
          { value: 'id', label: 'id', edit: false },
          { value: 'data', label: 'data', edit: true }
        ];
        return {
          headers,
          data: data.data,
          addButton: false,
          editable: false
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
          <CollectionRow
            key={`${d.id}-${i}`}
            headers={infoBundle.headers}
            data={d}
            selectedCollection={selectedCollection}
            editable={infoBundle.editable}
            noDelete={infoBundle.noDelete}
          />
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
              onClick={createNew}
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
          {infoBundle.data.length > 0 || addNew ? (
            <TableContainer>
              <Table size="small">
                <SortedTableHead
                  classes={classes}
                  order={order}
                  orderBy={orderBy}
                  onRequestSort={handleRequestSort}
                  headers={infoBundle.headers}
                />
                <TableBody>
                  {addNew && (
                    <CollectionRow
                      headers={infoBundle.headers}
                      data={{ id: v4() }}
                      selectedCollection={selectedCollection}
                      editable={infoBundle.editable}
                      addNew={true}
                      callback={endNew}
                    />
                  )}
                  {formatRows()}
                </TableBody>
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
