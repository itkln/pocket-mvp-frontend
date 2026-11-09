import {fireEvent,render,screen} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {VenueScreen} from "./venue";
import {apiRequest} from "../../../lib/api-client";
vi.mock('../../../lib/api-client',async(original)=>({...await original<object>(),apiRequest:vi.fn()}));
vi.mock('qrcode',()=>({default:{toDataURL:vi.fn(async()=>"data:image/png;base64,AA==")}}));
it('shows only the page link and QR in its own tab without unrelated settings',async()=>{
 vi.mocked(apiRequest).mockResolvedValue({url:'https://dish.example/ru/r/venue-id',published:true});
 render(<VenueScreen venue={{id:'venue-id',name:'Bistro',slug:'bistro',address:'Main 1',city:'Bratislava',country_code:'SK',timezone:'Europe/Bratislava',currency:'EUR',status:'active',settings:{},created_at:'2026-01-01'}} notify={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Страница и QR'}));
 expect(await screen.findByLabelText('Публичная ссылка')).toHaveValue('https://dish.example/ru/r/venue-id');
 expect(screen.getByRole('link',{name:'Открыть Pocket Dish'})).toHaveAttribute('href','https://dish.example/ru/r/venue-id');
 expect(screen.getByRole('img',{name:'QR-код страницы ресторана'})).toBeInTheDocument();
 expect(screen.queryByText('Новый онлайн-заказ')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Сохранить',exact:true})).not.toBeInTheDocument();
});
