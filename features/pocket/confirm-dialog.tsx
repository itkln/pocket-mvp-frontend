"use client";

import { AlertTriangle, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "./ui";
import { useI18n } from "./i18n";

type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmValue = { confirm: (options: ConfirmOptions) => Promise<boolean> };
const ConfirmContext = createContext<ConfirmValue>({ confirm: async () => true });

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((result: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOptions(next);
  }), []);

  return <ConfirmContext.Provider value={{ confirm }}>{children}{options && <div className="modal-backdrop confirm-backdrop" onMouseDown={() => close(false)}><section className="modal confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" onMouseDown={(event) => event.stopPropagation()}><header><div className="confirm-heading"><span><AlertTriangle size={20} /></span><h2 id="confirm-dialog-title">{options.title ?? t("Подтвердите удаление")}</h2></div><IconButton icon={X} label={t("Закрыть")} onClick={() => close(false)} /></header><div className="modal-body"><p id="confirm-dialog-description">{options.description}</p><small>{t("Это действие нельзя отменить.")}</small></div><footer><Button kind="secondary" onClick={() => close(false)}>{options.cancelLabel ?? t("Отмена")}</Button><Button kind="danger" onClick={() => close(true)}>{options.confirmLabel ?? t("Удалить")}</Button></footer></section></div>}</ConfirmContext.Provider>;
}

export const useConfirm = () => useContext(ConfirmContext);
