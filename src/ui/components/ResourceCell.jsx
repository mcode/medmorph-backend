import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, TableCell } from '@material-ui/core';

const ResourceCell = ({ cellKey, resource }) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {!open && <Button onClick={() => setOpen(!open)}> open </Button>}
      {open && (
        <div>
          <Button onClick={() => setOpen(!open)}> close</Button>
          <TableCell key={cellKey}>
            <pre>{JSON.stringify(resource, null, 2)}</pre>
          </TableCell>
        </div>
      )}
    </div>
  );
};

ResourceCell.propTypes = {
  cellKey: PropTypes.string,
  resource: PropTypes.object
};

export default ResourceCell;
