import React, { useState } from 'react';
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
      {/* {!open && <Button>hi</Button>} */}
    </div>
  );
};

export default ResourceCell;
