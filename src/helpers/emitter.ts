import mitt, { Emitter } from 'mitt';

type Events = {
  setFlightFilterModalState: boolean;
  refreshAchievements: undefined;
  setFlightFilterState: 'filter' | 'filter-outline';
  updateActualFlights: { refreshAnimation?: boolean; forceRefresh?: boolean };
  updatePastFlights: { refreshAnimation?: boolean; forceRefresh?: boolean };
  updateSettings: undefined;
  updateStats: undefined;
};

const emitter: Emitter<Events> = mitt<Events>();
export default emitter;
