import React from 'react';
import DevMenu from '../components/DevMenu';
import MainRoot from './index';
import AbtmKioskWatcher from '../components/AbtmKioskWatcher';

const MasterView = () => {
  return (
    <>
      <MainRoot />
      <AbtmKioskWatcher />
      {__DEV__ && <DevMenu />}
    </>
  );
};

export default MasterView;
