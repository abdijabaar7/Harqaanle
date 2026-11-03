# Digital Tailoring System MVP
## Qorshaha naqshadda UI/UX iyo Architecture Spec

**Xaalad:** Diyaar u ah design review  
**Nooca:** 0.1  
**Xadka:** Naqshad, user flows, prototype-spec iyo architecture. Ma aha oggolaansho implementation.

> Dukumentigani ma bilaabayo coding, backend, migrations, authentication, storage ama hirgelinta app-ka. Ansixinta design-ku keligeed ma bilaabayso implementation.

## 1. Ujeeddo iyo mabda'a naqshadda

Nidaamku wuxuu ka caawinayaa ganacsiyada tolidda inay maareeyaan macaamiisha, cabbirradooda, dalabyada, shaqada tolidda, sawirrada, lacagaha iyo qaadashada dharka. Waa SaaS multi-tenant ah: xogta ganacsi kasta waxay ku jirtaa xadkeeda, role kastana wuxuu arkaa oo keliya shaqada loo oggolaaday.

**Mabaadi'da UX**

- Hawlaha soo noqnoqda sida dalab cusub, raadinta macmiil iyo cusboonaysiinta xaaladdu waa inay ku fududaadaan telefoon.
- Foomamka dheer waxaa loo kala qaadaa tallaabooyin cad; xogta la geliyeyna waa la soo koobaa ka hor kaydin.
- Cabbirrada xarafka (S/M/L iwm.) iyo cabbirka tiro ahaan ee cm waa laba xogood oo kala duwan oo UI-gu si muuqata u kala saaro.
- Dalabku wuxuu hayaa snapshot cabbirro iyo qiimeyaal si xog dambe oo macmiilku bixiyo aanay u beddelin taariikhda dalabka.
- Doorka iyo ganacsiga firfircoon mar walba waa la muujiyaa; xad-gudubka gelitaanka waxaa lagu muujiyaa access denied.

## 2. Qaab-dhismeedka navigation-ka

### Super Admin

- Ganacsiyada
- Diiwaangeli ganacsi
- Maamulka gelitaanka
- Faahfaahinta ganacsiga (metadata iyo xaalad)
- Audit log / dhacdooyinka maamulka (naqshad ahaan)
- Profile iyo ka bax

Super Admin ma laha navigation qarsoon oo u furaya customer/order data. Xog tenant ah haddii mustaqbalka loo baahdo taageero awgeed, waxay u baahan tahay go'aan cad, sabab la diiwaangeliyo, oggolaansho xaddidan iyo audit.

### Business Admin

- Guudmar
- Dalabyo
- Macaamiil
- Cabbirro
- Galleyda faylasha
- Lacag-bixinno
- Staff iyo gelitaan
- Faahfaahinta ganacsiga
- Profile iyo ka bax

### Tailor Staff

- Shaqooyinkayga (shaashadda koowaad)
- Faahfaahinta shaqada loo oggolaaday
- Cusboonaysii xaalad
- Profile iyo ka bax

Staff-ka looma muujiyo links ama controls loogu talagalay cabbirro, qiimeyaal, lacag-bixin ama maamulka ganacsiga.

## 3. User flows

### Galitaan iyo password recovery

1. User-ku wuxuu geliyaa email/aqoonsiga iyo password.
2. Xaqiijinta guulaysata waxay u gudbisaa dashboard-ka ku habboon role-ka iyo business membership-ka.
3. Haddii user-ku ka tirsan yahay ganacsiyo badan, wuxuu doortaa ganacsiga firfircoon; xogta dashboard-ka iyo calaamadda ganacsiga ayaa is beddela.
4. Password recovery: codso link → fariin xaqiijin guud (aan shaacin in email-ku jiro) → link ammaan ah → password cusub → login.

### Business Admin: macmiil ilaa dalab

1. Guudmar → “Dalab cusub”.
2. Raadi macmiil jira ama samee macmiil cusub (magac iyo telefoon).
3. Dooro nooca dharka iyo tirada (haddii tiradu la ansixiyo).
4. Geli cabbirrada cm; dooro/ku qor labels-ka category-ga marka loo baahdo. Arag cabbirro hore, balse ku xaqiiji snapshot-ka dalabka.
5. Geli taariikhda dalabka, qaadashada, qiimaha iyo lacagta bilowga ah.
6. Ku dar sawirrada maro/naqshad; dooro nooca faylka oo arag upload progress/error.
7. Dib u eeg soo-koobidda (cabbirro snapshot, lacag iyo hadhaaga la xisaabiyey) → kaydi.
8. Dalabka la sameeyey wuxuu ka muuqdaa liiska iyo tracking-ka.

### Staff: fulinta shaqada

1. Shaqooyinkayga → kala saar maanta, soo socda iyo dib u dhacay.
2. Fur order-ka loo oggolaaday; arag tilmaamaha, snapshot cabbirrada iyo faylasha la fasaxay.
3. Riix “U gudbi xaaladda xigta”; xaqiiji tallaabada haddii ay muhiim tahay.
4. Nidaamku diiwaangeliyaa xaaladdii hore/ta cusub, cidda iyo waqtiga.
5. Haddii qaadashada la dhammeeyo, Business Admin ayaa diiwaangeliya bixinta iyo lacagaha; Staff-ku ma beddelo lacag.

### Macmiil iyo cabbirro hore

Macaamiil → raadi magaca/telefoonka → faahfaahin → cabbirro hore. “U isticmaal dalab cusub” wuxuu nuqul ka sameeyaa xogta la doortay oo u sameeya snapshot cusub; wax ka beddelka cabbirka macmiilka ma taabto orders hore.

### Super Admin: ganacsi iyo gelitaan

Ganacsiyada → raadi/sifee xaalad → faahfaahinta metadata → maamulka invitations/gelitaanka iyo xaaladda ganacsi. Shaashaddu ma soo bandhigto macaamiil, cabbirro, dalabyo, sawirro ama payments.

## 4. Wireframes qoraal ah

Wireframes-kan waa qaab-dhismeed lagu ansixinayo, mana sheeganayaan inay yihiin pixel-perfect comps.

### A. Business Admin dashboard

**Desktop**

```text
┌ Logo / Ganacsiga firfircoon ───────────── User, Role ┐
│ Sidebar: Guudmar | Dalabyo | Macaamiil | Lacag...   │
├─────────────────────────────────────────────────────┤
│ Subax wanaagsan, [Magac]           [+ Dalab cusub]  │
│ [Dalabyo furan] [Shaqooyinka maanta] [Dib u dhacay]│
│ [Wadarta la sugayo] [Lacagta maanta]                │
│ Shaqooyinka maanta       | Dalabyada dhowaan        │
│ # / Macmiil / deadline   | status / lacag / fur     │
└─────────────────────────────────────────────────────┘
```

**Mobile**

```text
┌ Ganacsi ▾                     ☰ ┐
│ Guudmar                          │
│ [+ Dalab cusub]                  │
│ [Maanta 4] [Dib u dhacay 2]      │
│ Lacagaha la sugayo: $…           │
│ Shaqooyinka maanta               │
│ Macmiil • Nooca dharka           │
│ Qaadasho: taariikh  [Fur →]      │
│ …                                │
└ Nav hoose: Guudmar Dalab Macmiil │
```

### B. Dalab cusub — tallaabooyin

**Desktop:** header leh business selector/role, progress stepper (Macmiil → Dharka & cabbirro → Taariikh & lacag → Sawirro → Dib-u-eegis), foom dhexe oo ballaaran, dhinac soo-koobid snapshot/hadhaa.

**Mobile:** hal tiir, tallaabo kasta bog yar, “Hore” iyo “Sii wad” ku dheggan hoose; xulashada sawirka telefoonka iyo camera upload waa ficillo waaweyn. Dib-u-eegista ugu dambaysa waxay kala muujisaa qaybaha, cm, taariikhda qaadashada, wadarta, la bixiyey iyo hadhaaga.

### C. Macaamiisha iyo cabbirrada

**Desktop:** raadis magac/telefoon + filter; jadwal leh magac, telefoon, dalabkii ugu dambeeyey iyo ficil. Faahfaahinta macmiilku waxay yeelataa tabs: Kooban, Cabbirro, Dalabyo.

**Mobile:** raadis korka; natiijooyinka waa cards taaban-karo. Faahfaahinta cabbirku waxay leedahay qayb “Shaati” iyo “Surwaal”; row kasta wuxuu leeyahay xaraf/category, qiime cm iyo marka/cidda gelisay.

### D. Order detail & tracking

**Desktop:** order ID, macmiil, qaadasho, status chip iyo action; timeline dhinac; cabbirrada snapshot iyo galleyda dhexe; lacagta iyo diiwaanka lacag-bixinta dhinac (Business Admin oo keliya).

**Mobile:** order ID + xaalad; badhanka ficilka ugu weyn; taariikh qaadasho iyo digniin dib-u-dhac; qaybaha la furi/kalaabi karo: Cabbirro, Sawirro, Lacag (role-gated), Taariikh xaaladeed.

### E. Tailor Staff dashboard

**Desktop:** filters “Maanta / Soo socda / Dib u dhacay”, shaqooyinka loo qoondeeyey oo keliya; columns order, dhar, qaadasho, xaalad iyo “Fur”.

**Mobile:** liis shaqooyin cards ah oo kala hormarsan deadline; card kasta wuxuu tusaa xaaladda iyo badhanka xaaladda xigta. Wax edit ah oo cabbir/lacag ah ma jiro.

### F. Super Admin dashboard

Desktop: tirooyinka ganacsiyada iyo xaaladaha; liis ganacsi oo leh magac, xaalad, taariikh la sameeyey, admin count; ficillo gelitaan/ganacsi. Mobile: cards iyo filter. Ma jiro meel customer/order lagu raadiyo.

### G. Galleyda faylasha iyo lacag-bixinta

- Galley: thumbnails, filter nooca Maro/Naqshad, order ID iyo upload status; telefoonka grid 2-column.
- Lacag: cards wadarta/la bixiyey/hadhaaga iyo ledger taariikhaysan; telefoonka entries cards. lacag-bixin cusub waxaa geli kara Business Admin oo keliya.
- Upload: dooro camera/gallery, preview, nooc, progress, retry iyo remove inta aan la kaydin; xadka/noocyada faylka waa go'aan furan.

## 5. Design system kooban

| Qayb | Tilmaanta bilowga ah |
|---|---|
| Primary | Navy `#122E40` — navigation, headings, primary action |
| Secondary | Teal `#0F6B7A` — links, selected states, progress |
| Accent | Orange `#F59E0B` — digniin, deadline, lacagta u baahan fiiro |
| Background | Light gray `#F5F7F8`; panels cad |
| Qoraal | Sans-serif la akhrin karo; hierarchy: page title, section, body, helper |
| Badhamo | Primary filled; secondary outline; destructive si cad loo calaamadeeyey; mobile min-height 44px |
| Fields | Label joogto ah, unit `cm` gudaha/ku dhow field, helper/error text muuqda; keyboard numeric cabbir/lacag |
| Tables | Header cad, row spacing, mobile cards; actions ma ku xirna hover oo keliya |
| Status chips | Midab + qoraal, midab keliya laguma kala saaro; 6-da xaaladood waxay leeyihiin labels buuxa |
| Upload | Dropzone desktop; camera/gallery mobile; preview, progress %, retry/error, fayl-nooc |

Midabada iyo font-ka waa soo-jeedin bilow ah, dib ayaa loo xaqiijinayaa. Contrast iyo xaaladaha focus/error waa in lagu daraa visual design-ka kama dambaysta ah.

## 6. Qaabka xaaladaha dalabka

1. Dalab cusub
2. Marada waa la diyaariyey
3. Jarista ayaa socota
4. Tolidda ayaa socota
5. Dharku waa dhammaaday
6. Macmiilka ayaa la siiyey

UI-gu wuxuu soo bandhigayaa xaaladda hadda, tallaabada xigta ee la oggol yahay iyo timeline-ka isbeddellada. Kala-guurka gadaal loogu noqdo, joojinta iyo sixidda xaalad khaldan weli waxay u baahan yihiin xeer ganacsi. Taariikhda xaaladdu waa audit trail oo aan si caadi ah loo tirtiri karin.

## 7. Role-permission matrix (soo-jeedin review)

| Awood | Super Admin | Business Admin | Tailor Staff |
|---|---|---|---|
| Maamulka business metadata | Haa, dhammaan ganacsiyada | Ganacsigiisa | Maya |
| User/member access | Maamulka guud ee la qeexay | Ganacsigiisa | Maya |
| Macaamiil iyo cabbirro | Maya (default design) | Akhri/qor ganacsigiisa | Akhri inta shaqada loo baahan yahay; wax ka beddel maya |
| Orders | Maya (default design) | Akhri/qor ganacsigiisa | Kuwa loo oggolaaday; akhri iyo status oo keliya |
| Qiimeyaal | Maya | Akhri/qor | Maya |
| Payments | Maya | Akhri/qor/ku dar diiwaan | Maya |
| Faylasha | Maya marka laga reebo policy taageero oo la ansixiyo | Ganacsigiisa | Faylasha shaqo loo oggolaaday |
| Status update | Maya | Haa | Haa, shaqo loo oggolaaday |
| Tirtirid maaliyadeed/status history | Maya | Maya; sixid la audit-gareeyo oo keliya | Maya |

Default-ka Super Admin ee jadwalkani waa xaddidaad UI/permission ah, waana in milkiilaha alaabtu xaqiijiyaa. Ma abuureyno awood cross-tenant oo qarsoon.

## 8. Architecture spec (naqshad, lama hirgelin)

### Qaybaha la qorsheeyey

- **Next.js + TypeScript:** app shell iyo routes role-aware; server-side actions/handlers ayaa loo adeegsadaa hawlaha u baahan xaqiijin server. UI-ga keliya laguma tiirsanaado amniga.
- **Tailwind CSS:** tokens iyo components responsive ah oo ku salaysan design system-kan.
- **Supabase Auth:** aqoonsiga user-ka iyo session; `profiles` waa app metadata ku xiran auth user.
- **PostgreSQL:** xogta ganacsiga, xiriirrada, constraints iyo hawlaha xisaabeed muhiimka ah.
- **RLS:** dhammaan jadwallada tenant-specific; policy-gu wuxuu hubiyaa user-ka la xaqiijiyey, membership active ah iyo role-ka. `business_id` ka yimid browser-ku ma aha caddayn oggolaansho.
- **Supabase Storage:** private bucket; policy-ga object-ku wuxuu xaqiijiyaa membership iyo xiriirka `order_files`/order. Signed URL gaaban ayaa la abuuraa kaddib oggolaansho.

### Xuduudaha amniga

- Jadwal kasta oo tenant-specific ah: `business_id NOT NULL`.
- Xiriirrada isku xira records tenant ah waa inay xaqiijiyaan in business-ku isku mid yahay (tusaale composite foreign keys/constraints halka ay ku habboon yihiin).
- Role permissions waa in lagu xaddido database policies iyo habab server-side ah; Staff ma update-gareyn karo columns cabbir, qiime ama lacag.
- Hadhaaga = wadarta order-ka laga jaray payments la aqbalay; xisaabinta authoritative-ka ah waa database/server, UI-gu waa bandhigid.
- Lacag-bixinnada iyo status history lama hard-delete-gareeyo; sixitaan wuxuu sameeyaa record la raad-raaci karo.
- `service_role` key marnaba browser-ka lama geeyo.
- Haddii Super Admin loo oggolaado tenant support, habku waa sabab leh, waqti/baaxad xaddidan iyo audit event; go'aanka weli furan.

## 9. Qaab xogeed la qiimeeyey

Qaabkan waa conceptual; types, constraints iyo cardinality-ga ugu dambeeya waa in la ansixiyaa ka hor schema design.

| Jadwal | Ujeeddo iyo fields muhiim ah |
|---|---|
| `businesses` | `id`, `name`, `status`, `created_at`, metadata/branding haddii la oggolaado; ma aha customer data |
| `profiles` | `user_id` (auth user), display name, contact iyo timestamps |
| `business_members` | `business_id NOT NULL`, `user_id`, role, membership status, invited/activated timestamps; unique business-user |
| `customers` | `business_id NOT NULL`, name, phone, created/updated by/time, archive marker haddii loo baahdo |
| `measurements` | `business_id NOT NULL`, customer, garment type (shirt/trouser), label/category iyo numeric cm values, captured_by/at, version/history relation |
| `orders` | `business_id NOT NULL`, customer, order date, pickup date, status, currency USD, total/price policy, created_by/at |
| `order_items` | `business_id NOT NULL`, order, garment type, quantity, item price; measurement snapshot fields ama xiriir snapshot ah oo aan is beddelin |
| `payments` | `business_id NOT NULL`, order, amount, currency, paid_at, method/reference haddii la ansixiyo, recorded_by, correction/reversal link |
| `order_files` | `business_id NOT NULL`, order, opaque object path/file id, kind (fabric/design), MIME/size metadata, upload state, uploaded_by/at |
| `order_status_history` | `business_id NOT NULL`, order, from/to status, actor, timestamp, note/reason (haddii la ansixiyo) |

**Constraints la rabo in la qeexo:** lacagtu waa decimal sax ah/units yar (go'aanka technical-ka), cabbirku numeric cm, pickup date iyo order date validation, status transitions, business-consistent foreign keys, iyo uniqueness/search strategy ee macmiilka. `business_id` dhammaan jadwallada tenant-ka ku jira waa required; profiles ama `businesses` laftoodu waa global/control-plane records, ma aha tenant row caadi ah.

**Snapshot:** order item-ku wuxuu hayaa cabbirrada waqtiga dalabka iyo label-ka loo adeegsaday; ma tixraacayo cabbir macmiil oo is beddeli kara isagoo keliya.

## 10. Shaashadaha system states

| Xaalad | Hab-dhaqan UI |
|---|---|
| Empty | Sharax waxa liisku yahay, sababta uu madhan yahay iyo ficilka xiga (tusaale “Abuur macmiil”) |
| Loading | Skeleton u eg qaabka xogta; ficillada aan diyaar ahayn waa disabled; ha muujin xog tenant hore marka business la beddelo |
| Validation | Khaladka agtiisa field-ka, summary sare marka form dheer yahay; date, cm, USD iyo phone si cad loo hubiyo |
| Upload progress | Fayl kasta progress iyo xaalad; upload socda lama sheegto inuu dhammaaday ilaa server-ku xaqiijiyo |
| Upload error | Sabab la fahmi karo, retry/remove; qaybaha kale ee form-ka si khalad ah looma tirtirayo |
| Access denied | Shaashad cad oo aan xogta la mamnuucay soo bandhigin; link ku noqoshada dashboard-ka saxda ah |
| Network/server error | Fariin iyo retry; ficil aan la xaqiijin dib looma tiriyo guul |
| Success | Xaqiijin iyo meesha laga sii wado; order ID iyo status cusub |

## 11. Prototype scope iyo acceptance checks

Prototype-ku waa inuu muujiyo click-through-kan (xog tusaale ah oo aan dhab ahayn):

1. Login → role dashboard.
2. Macaamiil: raadi ama samee macmiil.
3. Dalab: dooro macaamil, nooca dharka, geli cabbirrada cm, qaadashada iyo qiimaha.
4. Cabbirro: kala muuji labels/category iyo tirooyinka cm; soo bandhig snapshot preview.
5. Sawirro: ku dar mock file, tus thumbnail iyo progress/error states.
6. Dib u eeg oo samee dalab; tus lacag la bixiyey iyo hadhaaga.
7. U beddel xaaladda sida role-ku oggol yahay; muuji timeline.
8. Diiwaangeli lacag/qaadasho Business Admin ahaan; Staff view-gu ma laha lacag edit.

**Acceptance checks ee design review:** qofku ma garan karaa ganacsiga firfircoon iyo role-ka? Ma abuuri karaa dalab telefoonka isagoo aan ka boodin cabbirro snapshot? Staff ma fahmayaa shaqada uu beddeli karo? Super Admin ma arkaa oo keliya maamulka business/access? Hadhaaga iyo xaaladda dalabku ma leeyihiin macne cad?

Prototype la dhex mari karo wuxuu ku xirnaan doonaa qalabka design/prototyping ee la heli karo. Dukumentigan wuxuu bixiyaa flow iyo wireframe spec; ma sheeganayo in interactive prototype hore loo dhisay.

## 12. Go'aamada u baahan xaqiijin

| Go'aan | Soo-jeedin ku meel gaar ah | Sababta loo xaqiijinayo |
|---|---|---|
| Super Admin ma arkaa customer/order data? | Maya; business metadata iyo access maamulka oo keliya | Asturnaanta tenant-ka; support cross-tenant kasta wuxuu u baahan karaa sabab iyo audit |
| Staff ma arkaa dhammaan orders mise assigned-only? | Assigned-only | Baahida shaqo iyo xogta macmiilka ugu yar |
| Tiro dhar/order items badan? | Naqshadda xogtu way taageeri kartaa; UI-ga MVP hal/multiple wali furan | Saameyn ku leh form-ka iyo snapshot-ka |
| Payments qaybo ah? | UI-ga ledger-ku wuu taageeri karaa; ansixin ganacsi ayaa loo baahan yahay | Saameyn ku leh lacag ururin iyo hadhaaga |
| Xarfo S/M/L/B/K iyo B/L/C/T/K? | Labels/category; qiimaha numeric cm si gooni ah | Waxaa loo baahan yahay fasiraad sax ah oo xaraf kasta leeyahay |
| Branding/logo per business? | Magaca ganacsiga oo keliya bilow ahaan | Saameeya onboarding iyo header |
| Luqadda UI? | Somali wireframe; luqadaha kale go'aan dambe | Saameeya labels, format iyo taageero |
| Mobile breakpoints? | Responsive; px breakpoints lama go'aamin | Waxaa lagu xaqiijinayaa prototype iyo qalabka isticmaalaha |
| File size/types? | Sawirro caadi ah; xadka iyo MIME allowlist lama go'aamin | Saameeya upload UX, storage iyo amniga |
| Payment methods/currency details? | USD; habka lacag-bixinta iyo refund/reversal furan | Saameeya fields iyo audit |
| Dalab joojin/status dib-u-noqosho? | History ha sii jiro; rules lama go'aamin | Sixidda khalad iyo raad-raac |
| Xog macmiil duplicate ah? | Warning ku salaysan telefoon | Business-ku wuxuu yeelan karaa qoys/telefoon wadaag ah; policy-ga saxda ah furan |

## 13. Waxyaabaha aan MVP-ga ku jirin

Analytics culus, accounting buuxa, SMS, inventory iyo integrations dibadeed kuma jiraan ilaa si gaar ah loo ansixiyo.

## 14. Albaabka ansixinta

1. Dib u eeg flows, wireframes, permissions, schema concepts iyo go'aamada furan.
2. Xaqiiji ama wax ka beddel go'aamada qaybta 12.
3. Ansixi naqshadda si cad.
4. Kaddib, si gaar ah u far tallaabada xigta haddii la rabo. Ansixinta design-ka keligeed ma fasaxayso coding ama hirgelin.

## 15. Horumarka shaqada ka dib ansixinta

- **La diyaariyey:** migrations-ka schema/RLS, private Storage policies, atomic order/payment/status/assignment/summary functions, invitation acceptance, business suspension iyo audit ee `supabase/migrations/`.
- **La diyaariyey:** app shell Next.js/TypeScript/Tailwind, Supabase SSR Auth (login, recovery, callback, password update, sign out), dashboard role-aware, ganacsi abuuri + owner invite, staff invite/suspend/accept, customer search/history/measurement, order creation/detail/tracking, file upload/gallery, payments ledger, staff assignment iyo common loading/error/empty screens.
- **Ku jira:** jadwallada core-ka iyo xiriirrada ganacsi-gaar ah; customer/order measurement snapshot; USD payments; private-file metadata; assigned staff; order status history.
- **Ilaalinta lagu daray:** `business_id NOT NULL` dhammaan jadwallada tenant-specific; composite foreign keys ee xiriirrada muhiimka ah; RLS ku salaysan membership firfircoon; Super Admin uma laha policy tenant customer/order; hakinta ganacsigu waxay ka jartaa tenant-data access; payments iyo status history ma laha update/delete policies; status transition/order creation/payment/assignment/business status/metadata waa hawlo database oo xaddidan; membership abuuris/activation waxay maraan server-only invite iyo verified-user acceptance flow.
- **Weli lama samayn:** migrations lama dabaqin Supabase project; Auth dashboard settings, `order-files` private bucket iyo Storage config lama samayn. Deegaanka `.env.local` iyo Supabase project credentials lama helin; dependencies lama rakibin, app-kana lama build-gareyn/raacin. Xaqiijin/build lama samayn.
- **Default-yada implementation-ka ee weli review u furan:** Staff assigned-only, hal ama qaybo badan oo order ah, labels-ka cabbirka iyo habka payments. Database-ku wuxuu qaataa assigned-only, order_items badan iyo payments badan; foomka hadda jira hal nooc dhar ayuu geliyaa, wuxuuna adeegsadaa labels/categories iyo field keys cabbir oo ku-meel-gaar ah.

Tallaabooyinka xiga ee kala horreeya: (1) samee Supabase project oo geli environment variables; (2) xaqiiji field names/category labels, tirada dharka iyo xadka faylalka, kadibna ku dabaq migrations oo habeey Auth/private bucket; (3) rakib dependencies oo dhis app-ka; (4) dib u eeg access boundaries iyo UX dhammaan roles-ka.
