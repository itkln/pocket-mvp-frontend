import {beforeEach,expect,it,vi} from "vitest";
import DishPage from "../apps/dish/app/[locale]/[[...route]]/page";
import DishApp from "./dish-app";
import AuthPage from "./auth-page";
import {spotsReturnTo} from "../lib/spots-auth-navigation";
vi.mock("next/navigation",()=>({redirect:vi.fn((url:string)=>{throw new Error(`redirect:${url}`);}),notFound:vi.fn(()=>{throw new Error('not-found');}),useRouter:vi.fn(),usePathname:vi.fn(),useSearchParams:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
const page=(route:string[],query:Record<string,string>={})=>DishPage({params:Promise.resolve({locale:'ru',route}),searchParams:Promise.resolve(query)});
it('opens the same restaurant and QR capabilities through Dish',async()=>{
 const venue=await page(['r','venue-id']);expect(venue.type).toBe(DishApp);expect(venue.props).toMatchObject({initialScreen:'menu',venueID:'venue-id'});
 const qr=await page(['qr','existing-token']);expect(qr.props).toMatchObject({initialScreen:'table-home',qrToken:'existing-token'});
 await expect(page(['venue','venue-id'],{q:'кофе',from:'/ru/discover'})).rejects.toThrow('redirect:/ru/r/venue-id?q=%D0%BA%D0%BE%D1%84%D0%B5');
});
it('removes marketplace entry points and preserves guest accounts',async()=>{
 await expect(page([])).rejects.toThrow('not-found');
 for(const route of ['discover','restaurants','saved','history','profile','reservations','settings','notifications'])await expect(page([route])).rejects.toThrow('not-found');
 for(const screen of ['profile','reservations','settings','notifications'])expect((await page(['r','venue-id',screen])).props.initialScreen).toBe(screen);
 expect((await page(['login'],{returnTo:'/ru/r/venue-id'})).type).toBe(AuthPage);
 expect((await page(['login'],{returnTo:'/ru/r/venue-id'})).props).toMatchObject({product:'dish',returnTo:'/ru/r/venue-id'});
});
it('keeps restaurant and QR destinations after sign-in without allowing external redirects',()=>{
 expect(spotsReturnTo('/ru/r/venue-id?q=tea#menu','ru')).toBe('/ru/r/venue-id?q=tea#menu');
 expect(spotsReturnTo('/ru/qr/existing-token','ru')).toBe('/ru/qr/existing-token');
 expect(spotsReturnTo('//evil.example/ru/r/id','ru')).toBe('/ru');
});

it('opens reservations at a restaurant URL and rejects invalid nested routes',async()=>{
 expect((await page(['r','venue-id','menu'])).props).toMatchObject({initialScreen:'menu',venueID:'venue-id'});
 expect(spotsReturnTo('/ru/r/venue-id/menu?category=breakfast','ru')).toBe('/ru/r/venue-id/menu?category=breakfast');
 expect((await page(['r','venue-id','reservation'])).props).toMatchObject({initialScreen:'reservation',venueID:'venue-id'});
 expect((await page(['qr','table-token','profile'])).props).toMatchObject({initialScreen:'profile',qrToken:'table-token'});
 for(const route of [['r','venue-id','unknown'],['qr','table-token','reservation'],['r','venue-id','reservation','extra']])await expect(page(route)).rejects.toThrow('not-found');
 expect(spotsReturnTo('/ru/r/venue-id/reservation','ru')).toBe('/ru/r/venue-id/reservation');
 expect(spotsReturnTo('/ru/qr/table-token/profile','ru')).toBe('/ru/qr/table-token/profile');
 expect(spotsReturnTo('/ru/r/id/reservation/extra','ru')).toBe('/ru');
});

it('opens public QR menu and bill routes and retains them after authentication',async()=>{
 for(const [child,screen] of [['menu','table'],['bill','table-bill']]) {
  expect((await page(['qr','token',child])).props).toMatchObject({initialScreen:screen,qrToken:'token'});
  expect(spotsReturnTo(`/ru/qr/token/${child}`,'ru')).toBe(`/ru/qr/token/${child}`);
 }
 await expect(page(['r','venue','bill'])).rejects.toThrow('not-found');
 await expect(page(['qr','token','bill','extra'])).rejects.toThrow('not-found');
});
