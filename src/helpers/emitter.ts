import mitt, { Emitter } from 'mitt';

type Events = {
  setFlightFilterModalState: boolean;
  refreshAchievements: undefined;
  setFlightFilterState: 'filter' | 'filter-outline';
  updateActualFlights: boolean;
  updatePastFlights: boolean;
  updateSettings: undefined;
  updateStats: undefined;
}

const emitter: Emitter<Events> = mitt<Events>();
export default emitter;
