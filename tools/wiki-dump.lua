-- tools/wiki-dump.lua — lê as configs do servidor MTA (HAVOK) e imprime um JSON com os dados que a wiki usa.
-- Uso: lua5.1 tools/wiki-dump.lua <pasta [HAVOK]>   (chamado pelo tools/build-wiki-data; não precisa rodar à mão)
--
-- Cada resource é carregado num ambiente próprio (como no MTA), com as funções do MTA trocadas por um "boneco"
-- que aceita qualquer chamada. Os `local` do topo do arquivo viram globais (assim dá para ler tabelas como o
-- loot do airdrop, que é local). Nada é executado no servidor e nada é escrito: só leitura.

local ROOT = assert(arg[1], 'uso: lua wiki-dump.lua <pasta [HAVOK]>')
local DEP = ROOT .. '/[dependencies]/'

-- "boneco": qualquer índice, chamada ou conta devolve ele mesmo
local D = {}
local DM = {}
DM.__index = function() return D end
DM.__call = function() return D end
DM.__concat = function() return '' end
for _, op in ipairs({'__add', '__sub', '__mul', '__div', '__mod', '__pow', '__unm'}) do
    DM[op] = function() return 0 end
end
DM.__lt = function() return false end
DM.__le = function() return false end
setmetatable(D, DM)

local function newEnv()
    local env = {}
    -- ajudas de tempo que vários resources usam
    env.seconds = function(n) return n * 1000 end
    env.minutes = function(n) return n * 60000 end
    env.hours = function(n) return n * 3600000 end
    env.exports = D
    env.root = D
    env.resourceRoot = D
    env.localPlayer = nil
    setmetatable(env, {__index = function(_, k)
        local v = _G[k]
        if v ~= nil then return v end
        return D
    end})
    env._G = env
    return env
end

local function readFile(path)
    local f = io.open(path, 'rb')
    if not f then return nil end
    local s = f:read('*a')
    f:close()
    if s:sub(1, 1) == '\28' or s:sub(1, 4) == '\27Lua' then
        return nil -- compilado: não lê
    end
    return s
end

local warnings = {}
local function load(env, path, stripLocals)
    local src = readFile(path)
    if not src then
        table.insert(warnings, 'não achei/ não li: ' .. path)
        return false
    end
    src = src:gsub('^\239\187\191', '') -- BOM
    if stripLocals then
        -- só os do topo (coluna 0)
        src = ('\n' .. src):gsub('\nlocal%s+function%s+([%w_]+)', '\nfunction %1')
        src = src:gsub('\nlocal%s+([%w_]+)%s*=', '\n%1 =')
    end
    local fn, err = loadstring(src, '@' .. path)
    if not fn then
        table.insert(warnings, 'erro de sintaxe: ' .. tostring(err))
        return false
    end
    setfenv(fn, env)
    local ok, e = pcall(fn)
    if not ok then
        table.insert(warnings, 'erro ao rodar ' .. path .. ': ' .. tostring(e))
    end
    return ok
end

-- //------------------- JSON -------------------\\--
local function isArray(t)
    local n = 0
    for k in pairs(t) do
        if type(k) ~= 'number' or k < 1 or k ~= math.floor(k) then return false end
        n = n + 1
    end
    for i = 1, n do
        if t[i] == nil then return false end
    end
    return true, n
end

local function esc(s)
    return '"' .. s:gsub('[%c"\\]', function(c)
        if c == '"' then return '\\"' end
        if c == '\\' then return '\\\\' end
        if c == '\n' then return '\\n' end
        if c == '\t' then return '\\t' end
        if c == '\r' then return '\\r' end
        return string.format('\\u%04x', c:byte())
    end) .. '"'
end

local function enc(v, seen)
    local t = type(v)
    if v == D then return 'null' end
    if t == 'nil' then return 'null' end
    if t == 'boolean' then return tostring(v) end
    if t == 'number' then
        if v ~= v or v == math.huge or v == -math.huge then return 'null' end
        if v == math.floor(v) and math.abs(v) < 1e15 then return string.format('%d', v) end
        return string.format('%.6g', v)
    end
    if t == 'string' then return esc(v) end
    if t == 'table' then
        seen = seen or {}
        if seen[v] then return 'null' end
        seen[v] = true
        local arr, n = isArray(v)
        local out = {}
        if arr and n > 0 then
            for i = 1, n do out[i] = enc(v[i], seen) end
            seen[v] = nil
            return '[' .. table.concat(out, ',') .. ']'
        end
        local keys = {}
        for k, x in pairs(v) do
            if type(x) ~= 'function' and x ~= D then table.insert(keys, k) end
        end
        table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
        for _, k in ipairs(keys) do
            table.insert(out, esc(tostring(k)) .. ':' .. enc(v[k], seen))
        end
        seen[v] = nil
        return '{' .. table.concat(out, ',') .. '}'
    end
    return 'null' -- função, userdata
end

local OUT = {}

-- //------------------- GAMEMODE -------------------\\--
local gm = newEnv()
local G = ROOT .. '/gamemode/scripts/global/'
for _, f in ipairs({'g.utils.lua', 'g.dataConfig.lua', 'g.objects.lua', 'g.blueprints.lua', 'g.equipment.lua', 'g.gameplayConfig.lua'}) do
    load(gm, G .. f)
end

-- itens: só os campos que a wiki usa (o resto é estado do jogador ou encaixe 3D)
local items = {}
for name, d in pairs(gm.playerDataTable or {}) do
    if type(d) == 'table' and d.invSettings then
        local inv = d.invSettings
        local it = {
            itemType = inv.itemType, icon = inv.icon, maxStack = inv.maxStack,
            weapon = d.weaponSettings and {type = d.weaponSettings.type, damage = d.weaponSettings.damage,
                distance = d.weaponSettings.distance, weapID = d.weaponSettings.weapID} or nil,
            ammo = d.ammo, ammoTo = d.ammoTo, research = d.researchTableNeeds, craft = d.craftingCusto,
            recycler = d.recycler, receive = d.receiveOnCraft, maxSpawn = d.maxSpawnQuantity,
            furnace = d.furnanceSettings,
        }
        local ok, slot = pcall(gm.equipSlotOf, name)
        if ok and type(slot) == 'number' then it.equipSlot = slot end
        local okb, bp = pcall(gm.getBackpackData, name)
        if okb and type(bp) == 'table' then it.backpackBonus = bp.bonus end
        local okd, dur = pcall(gm.itemDurMax, name)
        if okd and type(dur) == 'number' then it.durability = dur end
        items[name] = it
    end
end
OUT.items = items

-- objetos (peças de base e construções); o limite por level vira uma lista (level 1..40)
local objects = {}
for name, d in pairs(gm.objectsDataTable or {}) do
    local o = {}
    for k, v in pairs(d) do
        if type(v) ~= 'function' then o[k] = v end
    end
    if type(d.limit) == 'function' then
        o.limitByLevel = {}
        for lvl = 1, 40 do
            local ok, r = pcall(d.limit, lvl)
            o.limitByLevel[lvl] = ok and r or 0
        end
        o.limit = nil
    end
    objects[name] = o
end
OUT.objects = objects
OUT.blueprints = gm.blueprints
OUT.vipTiers = gm.VIP_TIERS
OUT.baseLimit = gm.BASE_LIMIT_CURVE
OUT.equip = {slots = gm.EQUIP, slotCount = gm.EQUIP_SLOTS, baseSlots = gm.INV_BASE_SLOTS, vipSlots = gm.INV_VIP_SLOTS,
    maxSlots = gm.INV_MAX_SLOTS, suitConflict = gm.SUIT_CONFLICT, spawnPants = gm.SPAWN_PANTS}
OUT.globalChat = gm.GLOBAL_CHAT_ENABLED

-- //------------------- RESOURCES -------------------\\--
local function res(name, files, strip)
    local env = newEnv()
    for _, f in ipairs(files) do load(env, DEP .. name .. '/' .. f, strip) end
    return env
end

local tr = res('havok_translations', {'config.lua', 'extra.lua'})
-- só nome/descrição dos itens (pt/en)
local names = {}
for k, v in pairs(tr.translateArray or {}) do
    if type(v) == 'table' and type(v.name) == 'table' then
        names[k] = {name = {pt = v.name.pt, en = v.name.en},
            desc = type(v.desc) == 'table' and {pt = v.desc.pt, en = v.desc.en} or nil}
    end
end
OUT.translations = names

local shop = res('havok_shop', {'config.lua'})
OUT.shop = shop.tblLoja

local mission = res('havok_mission', {'config.lua'})
OUT.missions = {list = mission.missions, npcs = mission.MISSION_NPCS, range = mission.MISSION_NPC_RANGE}

local bp = res('havok_backpacks', {'g.config.lua'})
OUT.backpacks = bp.BACKPACKS

local custom = res('havok_custom', {'g.catalog.lua'})
local clothes = {}
for name, c in pairs(custom.CUSTOM_CLOTHES or {}) do
    clothes[name] = {slot = c.slot, tier = c.tier, name = c.name, icon = c.icon, male = c.m ~= nil, female = c.f ~= nil}
end
OUT.clothes = clothes
OUT.clothesOrder = custom.CUSTOM_CLOTHES_ORDER

local pick = res('havok_pickups', {'config.lua'})
OUT.loot = pick.possibleLoots
OUT.lootClothing = pick.lootClothing
local pickPvp = res('havok_pickups', {'config.pvp.lua'})
OUT.lootPvp = pickPvp.possibleLoots

local air = res('havok_airdrop', {'s_settings.lua'}, true)
OUT.airdrop = {mode = air.MODE, loot = air.POSSIBLE_LOOTS and air.POSSIBLE_LOOTS[air.MODE], clothes = air.AIRDROP_CLOTHES,
    points = type(air.spawnLocations) == 'table' and #air.spawnLocations or nil}

local heli = res('havok_helicopter', {'config.lua'})
OUT.helicopter = heli.PossibleItems

local hosp = res('havok_hospitals', {'config.lua', 'server/s.main.lua'}, true)
OUT.hospital = {loot = hosp.possibleLoots, points = type(hosp.hospitalSpawns) == 'table' and #hosp.hospitalSpawns or nil}

local farms = res('havok_farms', {'config.lua'})
local farmOut = {}
for kind, f in pairs(farms.farms or {}) do
    local got = {}
    for _, var in ipairs(f.variants or {}) do
        for _, it in ipairs(var.items or {}) do got[it[1]] = true end
    end
    local list = {}
    for k in pairs(got) do table.insert(list, k) end
    table.sort(list)
    local tools = {}
    for tool, h in pairs(f.hitSettings or {}) do tools[tool] = h.removeQuantity end
    farmOut[kind] = {items = list, tools = tools}
end
OUT.farms = farmOut

local kit = res('havok_kitwipe', {'server.lua'}, true)
OUT.kit = {normal = kit.KIT, vip = kit.VIP_KIT}

local veh = res('havok_vehicles', {'config.lua', 'client/c.armor.lua'})
local vcfg = {}
for id, v in pairs(veh.vehicleConfigs or {}) do vcfg[tostring(id)] = v end
OUT.vehicles = vcfg
local armor = {}
for id, m in pairs(veh.ARMORED_VEHICLES or {}) do armor[tostring(id)] = m end
OUT.vehicleArmor = armor

local safe = res('havok_safezone', {'g.config.lua'})
OUT.safezone = {zones = safe.SAFE_ZONES, leaveMs = safe.LEAVE_PROTECTION_MS, noBuild = safe.NO_BUILD_RADIUS}

local walkie = res('havok_walkie', {'g.config.lua'})
OUT.walkie = walkie.WALKIE

local wipe = res('havok_wipe', {'g.config.lua'})
OUT.wipe = wipe.WIPE or wipe.WIPE_CONFIG

local rz = res('havok_radiation_zones', {'zones.lua'}, true)
local zoneCount = 0
for _, v in pairs(rz) do
    if type(v) == 'table' and v ~= D and #v > 20 then zoneCount = math.max(zoneCount, #v) end
end
OUT.radiationPoints = zoneCount

OUT.warnings = warnings
io.write(enc(OUT))
