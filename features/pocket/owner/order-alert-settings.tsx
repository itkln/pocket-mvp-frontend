"use client";
import {useEffect,useRef,useState} from "react";
import {X} from "lucide-react";
import type {OrderAlertSettings} from "../../../lib/owner-api";
import {Button,IconButton} from "../ui";
import {useI18n} from "../i18n";
import {textOnColor} from "./order-waiting";
export function OrderAlertSettingsDialog({value,onSave,onClose}:{value:OrderAlertSettings;onSave:(value:OrderAlertSettings)=>Promise<void>;onClose:()=>void}) {
 const {t}=useI18n();const ref=useRef<HTMLDialogElement>(null);const [draft,setDraft]=useState(value);const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 const valid=Number.isInteger(draft.warning_minutes)&&Number.isInteger(draft.critical_minutes)&&draft.warning_minutes>0&&draft.critical_minutes>draft.warning_minutes&&draft.critical_minutes<=1440&&Number.isInteger(draft.preorder_lead_minutes)&&draft.preorder_lead_minutes>=0&&draft.preorder_lead_minutes<=1440;
 return <dialog ref={ref} className="order-alert-dialog" aria-labelledby="order-alert-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><form onSubmit={async e=>{e.preventDefault();if(!valid||busy)return;setBusy(true);setError(false);try{await onSave(draft);onClose();}catch{setError(true);}finally{setBusy(false);}}}>
 <header><h2 id="order-alert-title">{t("Ожидание кухни")}</h2><IconButton icon={X} label={t("Закрыть")} onClick={()=>{if(!busy)onClose();}} /></header>
 <p>{t("Подсветка новых и принятых заказов до начала готовки.")}</p>
 {(["warning","critical"] as const).map((level,i)=><section key={level}><h3>{t(i===0?"Предупреждение":"Критическое ожидание")}</h3><div className="order-alert-fields"><label>{t("Через минут")}<input required type="number" min={1} max={1440} value={draft[`${level}_minutes`]} disabled={busy} onChange={e=>setDraft({...draft,[`${level}_minutes`]:Number(e.target.value)})}/></label><label>{t("Цвет карточки")}<input type="color" value={draft[`${level}_color`]} disabled={busy} onChange={e=>setDraft({...draft,[`${level}_color`]:e.target.value})}/></label></div><div className="order-alert-preview" style={{background:draft[`${level}_color`],color:textOnColor(draft[`${level}_color`])}}>{t("Ожидание: {minutes} мин",{minutes:draft[`${level}_minutes`]})}</div></section>)}
 <label>{t("Начинать готовку до визита, мин")}<input type="number" required min={0} max={1440} value={draft.preorder_lead_minutes} disabled={busy} onChange={e=>setDraft({...draft,preorder_lead_minutes:Number(e.target.value)})}/></label>
 <p>{t("Для предзаказа ожидание считается от запланированного начала готовки, но не раньше поступления заказа.")}</p>
 {!valid&&<p role="alert">{t("Пороги должны быть положительными и возрастающими, не более 1440 минут.")}</p>}{error&&<p role="alert">{t("Не удалось сохранить изменения")}</p>}
 <footer><Button kind="quiet" disabled={busy} onClick={onClose}>{t("Отмена")}</Button><button className="button primary" type="submit" disabled={busy||!valid}>{t(busy?"Сохранение…":"Сохранить")}</button></footer>
 </form></dialog>;
}
