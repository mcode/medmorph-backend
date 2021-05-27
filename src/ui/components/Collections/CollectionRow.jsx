import React, { useReducer, useState } from 'react';
import { TableCell, TableRow } from '@material-ui/core';
import PropTypes from 'prop-types';
import CreateIcon from '@material-ui/icons/Create';
import ReactJson from 'react-json-view';
import useStyles from './styles';
import SaveIcon from '@material-ui/icons/Save';
import CancelIcon from '@material-ui/icons/Cancel';
import axios from 'axios';
import { useQueryClient } from 'react-query';
import AlertDialog from './AlertDialog';
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import base64url from 'base64url';

function CollectionRow(props) {
  const classes = useStyles();
  const queryClient = useQueryClient();

  const reducer = (state, action) => {
    return { ...state, [action.header]: action.value };
  };
  const { headers, data, selectedCollection, editable, addNew, callback, noDelete } = props;
  const [edit, setEdit] = useState(addNew);
  const [state, dispatch] = useReducer(reducer, data);

  const updateData = () => {
    const bundle = {};
    headers.forEach(header => {
      if (!header.viewOnly) {
        const value = state[header.value];
        if (value) bundle[header.value] = value;
      }
    });

    const query = bundle.id ? `id=${bundle.id}` : `fullUrl=${base64url(bundle.fullUrl)}`;
    axios.put(`/collection/${selectedCollection}?${query}`, bundle).then(() => {
      queryClient.invalidateQueries(['collections', { selectedCollection }]);
      setEdit(false);
      if (callback) {
        callback();
      }
    });
  };

  const handleJson = event => {
    // the event is a custom object returned from
    // JSONInput, not a regular event
    if (event.jsObject) {
      dispatch({ header: 'resource', value: event.jsObject });
    }
  };

  const cancelSave = () => {
    setEdit(false);
    if (callback) {
      callback();
    }
  };

  const deleteData = () => {
    const query = state.id ? `id=${state.id}` : `fullUrl=${base64url(state.fullUrl)}`;
    axios.delete(`/collection/${selectedCollection}?${query}`).then(() => {
      queryClient.invalidateQueries(['collections', { selectedCollection }]);
      setEdit(false);
    });
  };

  const renderNormal = () => {
    return (
      <>
        {headers.map((header, j) => {
          const cellKey = `${j}`;
          return (
            <TableCell key={cellKey} style={{ whiteSpace: 'nowrap' }}>
              {' '}
              {renderNormalTableCell(header.value)}{' '}
            </TableCell>
          );
        })}
        <TableCell>
          {editable && (
            <>
              <CreateIcon
                fontSize={'small'}
                color="secondary"
                classes={{ root: classes.icon }}
                onClick={() => {
                  setEdit(true);
                }}
              />
              {!noDelete && (
                <AlertDialog
                  title={`Are you sure?`}
                  content={`Delete entry ${data['id'] ??
                    data.resource.id} from ${selectedCollection}?`}
                  callback={deleteData}
                />
              )}
            </>
          )}
        </TableCell>
      </>
    );
  };

  const renderEdit = () => {
    return (
      <>
        {headers.map((header, j) => {
          const cellKey = `${j}`;
          return (
            <TableCell key={`${data.id}-${cellKey}`} style={{ whiteSpace: 'nowrap' }}>
              {' '}
              {renderEditTableCell(header, j)}{' '}
            </TableCell>
          );
        })}
        <TableCell>
          <SaveIcon
            fontSize={'small'}
            color="secondary"
            classes={{ root: classes.icon }}
            onClick={updateData}
          />
          <CancelIcon fontSize={'small'} classes={{ root: classes.icon }} onClick={cancelSave} />
        </TableCell>
      </>
    );
  };

  const renderNormalTableCell = headerValue => {
    if (headerValue === 'resource')
      return <ReactJson src={data.resource} collapsed={true} enableClipboard={false} />;
    else if (headerValue === 'data')
      return <ReactJson src={data} collapsed={true} enableClipboard={false} />;
    else if (data[headerValue]) return data[headerValue];
    else if (data.resource && data.resource[headerValue]) return data.resource[headerValue];
    else return '';
  };

  const renderEditTableCell = (header, j) => {
    if (header.value === 'resource' && header.edit)
      return (
        <JSONInput
          id={'json' + j}
          placeholder={state.resource}
          locale={locale}
          height="550px"
          onChange={handleJson}
        />
      );
    else if (header.value === 'resource')
      return <ReactJson src={data.resource} collapsed={true} enableClipboard={false} />;
    else if (header.value === 'data' && header.edit)
      return (
        <JSONInput
          id={'json' + j}
          placeholder={state}
          locale={locale}
          height="550px"
          onChange={handleJson}
        />
      );
    else if (header.value === 'data')
      return <ReactJson src={data} collapsed={true} enableClipboard={false} />;
    else if (header.edit || (addNew && !header.viewOnly))
      return (
        <input
          value={state[header.value]}
          className={classes.editInput}
          onChange={e => {
            dispatch({ header: header.value, value: e.target.value });
          }}
        />
      );
    else if (data[header.value]) return data[header.value];
    else if (data.resource && data.resource[header.value]) return data.resource[header.value];
    else return '';
  };

  return (
    <>
      <TableRow classes={edit ? { root: classes.tableRowEdit } : { root: classes.tableRow }}>
        {edit ? renderEdit() : renderNormal()}
      </TableRow>
    </>
  );
}

CollectionRow.propTypes = {
  headers: PropTypes.array.isRequired,
  data: PropTypes.object.isRequired,
  selectedCollection: PropTypes.string.isRequired,
  editable: PropTypes.bool.isRequired,
  addNew: PropTypes.bool.isRequired,
  callback: PropTypes.func.isRequired,
  noDelete: PropTypes.bool
};

export default CollectionRow;
