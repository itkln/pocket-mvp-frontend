"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createCategory, createMenuItem, createStaff, deleteCategory, deleteMenuItem, deleteStaff,
  getOwnerDashboard, listCategories, listMenuItems, listOrders, listPayments, listReviews, listStaff,
  replyReview, updateCategory, updateMenuItem, updateOrderStatus, updateStaff,
  type CategoryInput, type MenuItemInput, type OwnerCategory, type OwnerDashboard, type OwnerMenuItem,
  type OwnerOrder, type OwnerPayment, type OwnerReview, type OwnerStaffMember, type StaffInput,
} from "../../../lib/owner-api";

type OwnerWorkspace = {
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
  addCategory: (input: CategoryInput) => Promise<void>;
  editCategory: (id: string, input: CategoryInput) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  addItem: (input: MenuItemInput) => Promise<void>;
  editItem: (id: string, input: MenuItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  inviteStaff: (input: StaffInput) => Promise<void>;
  editStaff: (id: string, input: StaffInput) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  setOrderStatus: (id: string, status: OwnerOrder["status"]) => Promise<void>;
  answerReview: (id: string, reply: string) => Promise<void>;
};

const OwnerWorkspaceContext = createContext<OwnerWorkspace | null>(null);

export function OwnerWorkspaceProvider({ venueID, children, onError }: { venueID?: string; children: ReactNode; onError: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [categories, setCategories] = useState<OwnerCategory[]>([]);
  const [items, setItems] = useState<OwnerMenuItem[]>([]);
  const [staff, setStaff] = useState<OwnerStaffMember[]>([]);
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [payments, setPayments] = useState<OwnerPayment[]>([]);

  const run = useCallback(async (operation: () => Promise<void>) => {
    try { setError(""); await operation(); }
    catch (caught) { const message = caught instanceof Error ? caught.message : "Не удалось выполнить действие"; setError(message); onError(message); throw caught; }
  }, [onError]);

  const refresh = useCallback(async () => {
    if (!venueID) {
      setDashboard(null); setCategories([]); setItems([]); setStaff([]); setOrders([]); setReviews([]); setPayments([]);
      return;
    }
    setLoading(true);
    try {
      const [nextDashboard, nextCategories, nextItems, nextStaff, nextOrders, nextReviews, nextPayments] = await Promise.all([
        getOwnerDashboard(venueID), listCategories(venueID), listMenuItems(venueID), listStaff(venueID),
        listOrders(venueID), listReviews(venueID), listPayments(venueID),
      ]);
      setDashboard(nextDashboard); setCategories(nextCategories); setItems(nextItems); setStaff(nextStaff);
      setOrders(nextOrders); setReviews(nextReviews); setPayments(nextPayments); setError("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось загрузить данные заведения";
      setError(message); onError(message);
    } finally { setLoading(false); }
  }, [venueID, onError]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const value = useMemo<OwnerWorkspace>(() => ({
    loading,error,dashboard,categories,items,staff,orders,reviews,payments,refresh,
    addCategory: (input) => run(async()=>{const created=await createCategory(venueID!,input);setCategories(current=>[...current,created]);}),
    editCategory: (id,input) => run(async()=>{const updated=await updateCategory(venueID!,id,input);setCategories(current=>current.map(item=>item.id===id?updated:item));}),
    removeCategory: (id) => run(async()=>{await deleteCategory(venueID!,id);setCategories(current=>current.filter(item=>item.id!==id));}),
    addItem: (input) => run(async()=>{const created=await createMenuItem(venueID!,input);setItems(current=>[...current,created]);setCategories(current=>current.map(category=>category.id===created.category_id?{...category,item_count:category.item_count+1}:category));}),
    editItem: (id,input) => run(async()=>{const previous=items.find(item=>item.id===id);const updated=await updateMenuItem(venueID!,id,input);setItems(current=>current.map(item=>item.id===id?updated:item));if(previous&&previous.category_id!==updated.category_id)setCategories(current=>current.map(category=>category.id===previous.category_id?{...category,item_count:Math.max(0,category.item_count-1)}:category.id===updated.category_id?{...category,item_count:category.item_count+1}:category));}),
    removeItem: (id) => run(async()=>{const previous=items.find(item=>item.id===id);await deleteMenuItem(venueID!,id);setItems(current=>current.filter(item=>item.id!==id));if(previous)setCategories(current=>current.map(category=>category.id===previous.category_id?{...category,item_count:Math.max(0,category.item_count-1)}:category));}),
    inviteStaff: (input) => run(async()=>{const created=await createStaff(venueID!,input);setStaff(current=>[...current,created]);}),
    editStaff: (id,input) => run(async()=>{const updated=await updateStaff(venueID!,id,input);setStaff(current=>current.map(item=>item.id===id?updated:item));}),
    removeStaff: (id) => run(async()=>{await deleteStaff(venueID!,id);setStaff(current=>current.filter(item=>item.id!==id));}),
    setOrderStatus: (id,status) => run(async()=>{const updated=await updateOrderStatus(venueID!,id,status);setOrders(current=>current.map(item=>item.id===id?updated:item));}),
    answerReview: (id,reply) => run(async()=>{const updated=await replyReview(venueID!,id,reply);setReviews(current=>current.map(item=>item.id===id?updated:item));}),
  }), [loading,error,dashboard,categories,items,staff,orders,reviews,payments,refresh,run,venueID]);

  return <OwnerWorkspaceContext.Provider value={value}>{children}</OwnerWorkspaceContext.Provider>;
}

export function useOwnerWorkspace() {
  const context = useContext(OwnerWorkspaceContext);
  if (!context) throw new Error("useOwnerWorkspace must be used inside OwnerWorkspaceProvider");
  return context;
}
