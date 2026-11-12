"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getOrderAlertSettings,
  saveOrderAlertSettings,
  type OrderAlertSettings,
  resendStaffInvitation,
  createCategory,
  createMenuItem,
  createStaff,
  deleteCategory,
  deleteMenuItem,
  deleteStaff,
  listOrderPage,
  type OrderQuery,
  type OrderPage,
  getOrder,
  getOwnerDashboard,
  listCategories,
  listMenuItems,
  loadOrderQueue,
  listPayments,
  listReviews,
  listStaff,
  reorderCategories as saveCategoryOrder,
  reorderMenuItems as saveMenuItemOrder,
  replyReview,
  updateCategory,
  updateMenuItem,
  updateOrderStatus,
  updateStaff,
  type CategoryInput,
  type MenuItemInput,
  type OwnerCategory,
  type OwnerDashboard,
  type OwnerMenuItem,
  type OrderCancellation,
  type OwnerOrder,
  type OwnerPayment,
  type OwnerReview,
  type OwnerStaffMember,
  type StaffInput,
} from "../../../lib/owner-api";
import { useLocalizedError } from "../error-message";

type OwnerWorkspace = {
  venueID?: string;
  orderAlerts?: OrderAlertSettings;
  saveOrderAlerts: (value: OrderAlertSettings) => Promise<void>;
  venueTimezone?: string;
  readScope?: string;
  onArrivals?: (orders: OwnerOrder[]) => void;
  loading: boolean;
  error: string;
  dashboard: OwnerDashboard | null;
  categories: OwnerCategory[];
  items: OwnerMenuItem[];
  staff: OwnerStaffMember[];
  orders: OwnerOrder[];
  reviews: OwnerReview[];
  payments: OwnerPayment[];
  refresh: () => Promise<void>;
  refreshOrders: () => Promise<OwnerOrder[] | undefined>;
  hasMoreOrderHistory: boolean;
  loadMoreOrderHistory: () => Promise<void>;
  addCategory: (input: CategoryInput) => Promise<void>;
  editCategory: (id: string, input: CategoryInput) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  addItem: (input: MenuItemInput) => Promise<void>;
  editItem: (id: string, input: MenuItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  reorderCategories: (ids: string[]) => Promise<void>;
  reorderItems: (categoryID: string, ids: string[]) => Promise<void>;
  resendInvitation: (id: string) => Promise<void>;
  inviteStaff: (input: StaffInput) => Promise<boolean>;
  editStaff: (id: string, input: StaffInput) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  getHistoryPage?: (query: OrderQuery) => Promise<OrderPage>;
  getOrderDetails: (id: string) => Promise<OwnerOrder>;
  setOrderStatus: (
    id: string,
    status: OwnerOrder["status"],
    cancellation?: OrderCancellation,
  ) => Promise<void>;
  answerReview: (id: string, reply: string) => Promise<void>;
};

const OwnerWorkspaceContext = createContext<OwnerWorkspace | null>(null);

function applyOrder<T extends { id: string; sort_order: number }>(items: T[], ids: string[]) {
  const order = new Map(ids.map((id, index) => [id, index]));
  return items
    .map((item) => (order.has(item.id) ? { ...item, sort_order: order.get(item.id)! } : item))
    .sort((left, right) => left.sort_order - right.sort_order);
}

function applyCategoryItemOrder(items: OwnerMenuItem[], categoryID: string, ids: string[]) {
  const ordered = applyOrder(
    items.filter((item) => item.category_id === categoryID),
    ids,
  );
  let index = 0;
  return items.map((item) => (item.category_id === categoryID ? ordered[index++] : item));
}

export function OwnerWorkspaceProvider({
  venueID,
  venueTimezone,
  children,
  onError,
  onArrivals,
  readScope,
  ordersOnly = false,
  withMenu = false,
}: {
  venueTimezone?: string;
  readScope?: string;
  onArrivals?: (orders: OwnerOrder[]) => void;
  ordersOnly?: boolean;
  // Staff who manage the menu (managers) also load categories and items.
  withMenu?: boolean;
  venueID?: string;
  children: ReactNode;
  onError: (message: string) => void;
}) {
  const errorMessage = useLocalizedError();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [categories, setCategories] = useState<OwnerCategory[]>([]);
  const [items, setItems] = useState<OwnerMenuItem[]>([]);
  const [staff, setStaff] = useState<OwnerStaffMember[]>([]);
  const queueScope = useRef(new AbortController());
  useEffect(() => {
    if (queueScope.current.signal.aborted) queueScope.current = new AbortController();
    const controller = queueScope.current;
    return () => controller.abort();
  }, [venueID, ordersOnly]);
  const ordersRevision = useRef(0);
  const orderMutationPending = useRef(false);
  const [orderAlerts, setOrderAlerts] = useState<OrderAlertSettings>();
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const historyPages = useRef(1);
  const [hasMoreOrderHistory, setHasMoreOrderHistory] = useState(false);
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [payments, setPayments] = useState<OwnerPayment[]>([]);

  const run = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      try {
        setError("");
        return await operation();
      } catch (caught) {
        const message = errorMessage(caught);
        setError(message);
        onError(message);
        throw caught;
      }
    },
    [errorMessage, onError],
  );

  const refresh = useCallback(async () => {
    if (!venueID) {
      setDashboard(null);
      setCategories([]);
      setItems([]);
      setStaff([]);
      setOrders([]);
      setReviews([]);
      setPayments([]);
      return;
    }
    setLoading(true);
    const revision = ++ordersRevision.current;
    try {
      if (ordersOnly) {
        const next = await loadOrderQueue(venueID, historyPages.current, queueScope.current.signal);
        if (revision === ordersRevision.current) {
          setOrders(next.orders);
          setHasMoreOrderHistory(next.hasMoreHistory);
        }
        if (withMenu) {
          const [nextCategories, nextItems] = await Promise.all([
            listCategories(venueID),
            listMenuItems(venueID),
          ]);
          setCategories(nextCategories);
          setItems(nextItems);
        }
        setError("");
        return;
      }
      const [
        nextDashboard,
        nextCategories,
        nextItems,
        nextStaff,
        nextOrders,
        nextReviews,
        nextPayments,
      ] = await Promise.all([
        getOwnerDashboard(venueID),
        listCategories(venueID),
        listMenuItems(venueID),
        listStaff(venueID),
        loadOrderQueue(venueID, historyPages.current, queueScope.current.signal),
        listReviews(venueID),
        listPayments(venueID),
      ]);
      setDashboard(nextDashboard);
      setCategories(nextCategories);
      setItems(nextItems);
      setStaff(nextStaff);
      if (revision === ordersRevision.current) {
        setOrders(nextOrders.orders);
        setHasMoreOrderHistory(nextOrders.hasMoreHistory);
      }
      setReviews(nextReviews);
      setPayments(nextPayments);
      setError("");
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      const message = errorMessage(caught, "Не удалось загрузить данные заведения");
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  }, [errorMessage, venueID, onError, ordersOnly, withMenu]);

  const refreshOrders = useCallback(async () => {
    if (!venueID || orderMutationPending.current) return;
    const revision = ++ordersRevision.current;
    const [next, alerts] = await Promise.all([
      loadOrderQueue(venueID, historyPages.current, queueScope.current.signal),
      getOrderAlertSettings(venueID),
    ]);
    if (revision === ordersRevision.current) setOrderAlerts(alerts);
    if (revision === ordersRevision.current) {
      setOrders(next.orders);
      setHasMoreOrderHistory(next.hasMoreHistory);
      return next.orders;
    }
  }, [venueID]);

  const loadMoreOrderHistory = useCallback(async () => {
    historyPages.current += 1;
    try {
      await refreshOrders();
    } catch (error) {
      historyPages.current -= 1;
      throw error;
    }
  }, [refreshOrders]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const getHistoryPage = useCallback(
    (query: OrderQuery) => listOrderPage(venueID!, { ...query, scope: "history" }),
    [venueID],
  );
  const getOrderDetails = useCallback((id: string) => getOrder(venueID!, id), [venueID]);
  const value = useMemo<OwnerWorkspace>(
    () => ({
      venueID,
      orderAlerts,
      saveOrderAlerts: async (value) => {
        const saved = await saveOrderAlertSettings(venueID!, value);
        setOrderAlerts(saved);
      },
      venueTimezone,
      readScope,
      onArrivals,
      loading,
      error,
      dashboard,
      categories,
      items,
      staff,
      orders,
      reviews,
      payments,
      refresh,
      refreshOrders,
      hasMoreOrderHistory,
      loadMoreOrderHistory,
      addCategory: (input) =>
        run(async () => {
          const created = await createCategory(venueID!, input);
          setCategories((current) => [...current, created]);
        }),
      editCategory: (id, input) =>
        run(async () => {
          const updated = await updateCategory(venueID!, id, input);
          setCategories((current) => current.map((item) => (item.id === id ? updated : item)));
        }),
      removeCategory: (id) =>
        run(async () => {
          await deleteCategory(venueID!, id);
          setCategories((current) => current.filter((item) => item.id !== id));
        }),
      addItem: (input) =>
        run(async () => {
          const created = await createMenuItem(venueID!, input);
          setItems((current) => [...current, created]);
          setCategories((current) =>
            current.map((category) =>
              category.id === created.category_id
                ? { ...category, item_count: category.item_count + 1 }
                : category,
            ),
          );
        }),
      editItem: (id, input) =>
        run(async () => {
          const previous = items.find((item) => item.id === id);
          const updated = await updateMenuItem(venueID!, id, input);
          setItems((current) => current.map((item) => (item.id === id ? updated : item)));
          if (previous && previous.category_id !== updated.category_id)
            setCategories((current) =>
              current.map((category) =>
                category.id === previous.category_id
                  ? { ...category, item_count: Math.max(0, category.item_count - 1) }
                  : category.id === updated.category_id
                    ? { ...category, item_count: category.item_count + 1 }
                    : category,
              ),
            );
        }),
      removeItem: (id) =>
        run(async () => {
          const previous = items.find((item) => item.id === id);
          await deleteMenuItem(venueID!, id);
          setItems((current) => current.filter((item) => item.id !== id));
          if (previous)
            setCategories((current) =>
              current.map((category) =>
                category.id === previous.category_id
                  ? { ...category, item_count: Math.max(0, category.item_count - 1) }
                  : category,
              ),
            );
        }),
      reorderCategories: async (ids) => {
        const previous = categories;
        setCategories((current) => applyOrder(current, ids));
        try {
          await run(() => saveCategoryOrder(venueID!, ids));
        } catch (error) {
          setCategories(previous);
          throw error;
        }
      },
      reorderItems: async (categoryID, ids) => {
        const previous = items;
        setItems((current) => applyCategoryItemOrder(current, categoryID, ids));
        try {
          await run(() => saveMenuItemOrder(venueID!, categoryID, ids));
        } catch (error) {
          setItems(previous);
          throw error;
        }
      },
      resendInvitation: (id) => run(() => resendStaffInvitation(venueID!, id)),
      inviteStaff: (input) =>
        run(async () => {
          const created = await createStaff(venueID!, input);
          setStaff((current) => [...current, created]);
          return created.invite_delivery !== "failed";
        }),
      editStaff: (id, input) =>
        run(async () => {
          const updated = await updateStaff(venueID!, id, input);
          setStaff((current) => current.map((item) => (item.id === id ? updated : item)));
        }),
      removeStaff: (id) =>
        run(async () => {
          await deleteStaff(venueID!, id);
          setStaff((current) => current.filter((item) => item.id !== id));
        }),
      getHistoryPage,
      getOrderDetails,
      setOrderStatus: (id, status, cancellation) =>
        run(async () => {
          const existing = orders.find((order) => order.id === id);
          if (!existing) throw new Error("Заказ не найден");
          orderMutationPending.current = true;
          ++ordersRevision.current;
          try {
            const updated = await updateOrderStatus(
              venueID!,
              id,
              status,
              existing.status,
              cancellation,
            );
            setOrders((current) => current.map((item) => (item.id === id ? updated : item)));
          } finally {
            orderMutationPending.current = false;
          }
        }),
      answerReview: (id, reply) =>
        run(async () => {
          const updated = await replyReview(venueID!, id, reply);
          setReviews((current) => current.map((item) => (item.id === id ? updated : item)));
        }),
    }),
    [
      orderAlerts,
      getHistoryPage,
      getOrderDetails,
      venueTimezone,
      readScope,
      onArrivals,
      loading,
      error,
      dashboard,
      categories,
      items,
      staff,
      orders,
      reviews,
      payments,
      refresh,
      refreshOrders,
      hasMoreOrderHistory,
      loadMoreOrderHistory,
      run,
      venueID,
    ],
  );

  return <OwnerWorkspaceContext.Provider value={value}>{children}</OwnerWorkspaceContext.Provider>;
}

export function useOwnerWorkspace() {
  const context = useContext(OwnerWorkspaceContext);
  if (!context) throw new Error("useOwnerWorkspace must be used inside OwnerWorkspaceProvider");
  return context;
}
