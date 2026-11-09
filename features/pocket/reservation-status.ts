import type { CustomerReservation } from "../../lib/reservations-api";

export const reservationStatusLabels = {
  confirmed: "Подтверждена", seated: "Гости в заведении", completed: "Завершена",
  cancelled: "Отменена", no_show: "Визит не состоялся",
} satisfies Record<CustomerReservation["status"], string>;
