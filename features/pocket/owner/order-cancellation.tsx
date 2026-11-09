"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "../i18n";
import { Button, IconButton } from "../ui";
import type { OrderCancellation } from "../../../lib/owner-api";
export const cancellationReasons: Record<string,string> = {guest_request:"По просьбе гостя", unavailable:"Блюдо недоступно", duplicate:"Дублирующий заказ", kitchen_issue:"Проблема на кухне", other:"Другая причина"};
export function OrderCancellationDialog({busy,failed,onClose,onConfirm}:{busy:boolean;failed:boolean;onClose:()=>void;onConfirm:(value:OrderCancellation)=>void}) {
 const {t}=useI18n(); const dialog=useRef<HTMLDialogElement>(null);
 const [reason,setReason]=useState(""); const [comment,setComment]=useState("");
 useEffect(()=>{const el=dialog.current;el?.showModal();return ()=>el?.close();},[]);
 return <dialog ref={dialog} className="order-cancellation-dialog" role="alertdialog" aria-labelledby="cancel-order-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
 <form onSubmit={e=>{e.preventDefault();if(reason&&!busy)onConfirm({reason,comment});}}>
 <header><h2 id="cancel-order-title">{t("Отменить заказ?")}</h2><IconButton icon={X} label={t("Закрыть")} onClick={()=>{if(!busy)onClose();}}/></header>
 <p>{t("Заказ будет отменён. Это действие нельзя отменить.")}</p>
 <label>{t("Причина отмены")}<select required value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}><option value="">{t("Выберите причину")}</option>{Object.entries(cancellationReasons).map(([key,label])=><option value={key} key={key}>{t(label)}</option>)}</select></label>
 <label>{t("Комментарий (необязательно)")}<textarea maxLength={500} value={comment} disabled={busy} onChange={e=>setComment(e.target.value)}/></label><small>{comment.length}/500</small>
 {failed&&<p role="alert">{t("Действие не выполнено. Проверьте актуальный статус заказа и повторите попытку.")}</p>}
 <footer><Button kind="quiet" disabled={busy} onClick={onClose}>{t("Отмена")}</Button><button type="submit" className="button danger" disabled={busy||!reason}>{t(busy?"Сохранение...":"Отменить заказ")}</button></footer>
 </form></dialog>;
}
