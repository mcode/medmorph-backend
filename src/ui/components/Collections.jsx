import React, { useState } from 'react';
import Select from 'react-select';
import axios from 'axios';

const Collections = () => {
  const [data, setData] = useState({ collectionType: '', data: [] });
  const collections = [
    { value: 'servers', label: 'Servers' },
    { value: 'endpoints', label: 'Endpoints' },
    { value: 'subscriptions', label: 'Subscriptions' }
  ];

  const onSelect = selectedOption => {
    axios.get(`http://localhost:3000/${selectedOption.value}`).then(response => {
      setData({ collectionType: selectedOption.value, data: response.data });
    });
  };

  return (
    <div>
      Medmorph Frontend
      <Select options={collections} onChange={onSelect} />
      <ul>
        {data.data.map(d => (
          <li>{d.id}</li>
        ))}
      </ul>
    </div>
  );
};

export default Collections;
