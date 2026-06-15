import { exec, toast } from './assets/kernelsu.js'
import './assets/mwc.js'

document.querySelector('div.preload-hidden').classList.remove('preload-hidden')

const MODDIR = '/data/adb/modules/brene'
const PERSISTENT_DIR = '/data/adb/brene'
const SUSFS_BIN = '/data/adb/ksu/bin/susfs'
const KSU_BIN = '/data/adb/ksud'
const configs = [
	{
		id: 'hide_sus_mnts_for_non_su_procs',
		action: (enabled) => setFeature(`${SUSFS_BIN} hide_sus_mnts_for_non_su_procs ${enabled ? 1 : 0}`),
	},
	{
		id: 'su_compat',
		action: (enabled) => setFeature(`${KSU_BIN} feature set su_compat ${enabled ? 1 : 0} && ${KSU_BIN} feature save`),
	},
	{
		id: 'kernel_umount',
		action: (enabled) => setFeature(`${KSU_BIN} feature set kernel_umount ${enabled ? 1 : 0} && ${KSU_BIN} feature save`),
	},
	{
		id: 'developer_options',
		action: (enabled) => setFeature(`settings put global development_settings_enabled ${enabled ? 1 : 0}`),
	},
	{
		id: 'usb_debugging',
		action: (enabled) => setFeature(`settings put global adb_enabled ${enabled ? 1 : 0}`),
	},
	{
		id: 'wireless_debugging',
		action: (enabled) => setFeature(`settings put global adb_wifi_enabled ${enabled ? 1 : 0}`),
	},
	{
		id: 'selinux',
		action: (enabled) => setFeature(`setenforce ${enabled ? 1 : 0}`),
	},
	{ id: 'pif_props' },
	{ id: 'rom_props' },
	{ id: 'brene_logs' },
	{ id: 'enable_log' },
	{ id: 'uname_spoofing' },
	{ id: 'hide_injections' },
	{ id: 'custom_uname_spoofing' },
	{ id: 'enable_avc_log_spoofing' },
	{ id: 'umount_suspicious_mounts' },
	{ id: 'umount_suspicious_mounts_500k' },
	{ id: 'proc_cmdline_bootconfig_spoofing' },
	{ id: 'android_system_properties_spoofing' },

	{ id: 'paths_hiding__non_standard_sdcard' },
	{ id: 'paths_hiding__non_standard_sdcard_android' },
	{ id: 'paths_hiding__data_local_tmp' },
	{ id: 'paths_hiding__sdcard_android_data_media_obb' },
]

// Load Kernel Version
exec('uname -r').then((result) => {
	const container = document.querySelector('#kernel-version .card-row__sub')
	if (result.errno !== 0) {
		container.innerText = t('msg_failed_load')
		return
	}
	container.innerText = result.stdout
})

// Load ..5.u.S Status
exec('[[ -e /sdcard/..5.u.S ]]').then((result) => {
	const container = document.querySelector('#sus-status .card-row__sub')
	if (result.errno !== 0) {
		container.dataset.susState = 'not_found'
		container.innerText = t('msg_sus_not_found')
	} else {
		container.dataset.susState = 'found'
		container.innerText = t('msg_sus_found')
	}
})

// Recommended Modules
exec('ksud module list').then((result) => {
	if (result.errno !== 0) return

	const container = document.querySelector('#recommended-modules')
	const modules = JSON.parse(result.stdout)
	const moduleIds = modules.map((mod) => mod.id)
	const cardRows = container.querySelectorAll('.card-row')

	const markInstalled = (span) => {
		span.setAttribute('data-i18n', 'status_installed')
		span.dataset.installedColor = '#4CAF50'
		span.innerText = t('status_installed')
		span.style.color = '#4CAF50'
	}

	cardRows.forEach((row) => {
		const moduleKey = row.getAttribute('data-module')
		const statusSpan = row.querySelector('.status-text')
		if (moduleIds.includes(moduleKey)) markInstalled(statusSpan)
	})

	// Vector / LSPosed
	const lsposedIds = ['lsposed', 'zygisk_lsposed', 'LSPosed']
	const lsposedInstalled = lsposedIds.some((id) => moduleIds.includes(id))
	if (lsposedInstalled) {
		const card = document.querySelector('[data-module="zygisk_vector"]')
		if (card) markInstalled(card.querySelector('.status-text'))
	}

	// HMA-OSS app check
	exec('pm list packages org.frknkrc44.hma_oss').then((result) => {
		if (result.errno !== 0) return
		if (!result.stdout.includes('org.frknkrc44.hma_oss')) return
		const card = document.querySelector('[data-module="hma_oss_zygisk"]')
		if (card) markInstalled(card.querySelector('.status-text'))
	})

	exec('[[ -e /data/adb/modules/TA_utl ]]').then((result) => {
		if (result.errno !== 0) return
		const card = document.querySelector('[data-module="tricky_addon"]')
		markInstalled(card.querySelector('.status-text'))
	})

})

// Incompatible Modules
exec('ksud module list').then((result) => {
	if (result.errno !== 0) return

	const container = document.querySelector('#incompatible-modules')
	const modules = JSON.parse(result.stdout)
	const moduleIds = modules.map((mod) => mod.id)
	const cardRows = container.querySelectorAll('.card-row')

	cardRows.forEach((row) => {
		const moduleKey = row.getAttribute('data-module')
		const statusSpan = row.querySelector('.status-text')

		if (moduleIds.includes(moduleKey)) {
			statusSpan.setAttribute('data-i18n', 'status_incompatible')
			statusSpan.dataset.installedColor = '#ff0000be'
			statusSpan.innerText = t('status_incompatible')
			statusSpan.style.color = '#ff0000be'
		}
	})
})

// Load enabled features
exec('susfs show enabled_features').then((result) => {
	const container = document.getElementById('kernel-features-container')
	if (result.errno !== 0) {
		container.innerText = t('msg_failed_features')
		return
	}
	container.innerText = result.stdout.replaceAll('CONFIG_KSU_SUSFS_', '')
})

// Load logs
exec(`cat ${PERSISTENT_DIR}/log.txt`).then((result) => {
	const container = document.getElementById('logs')
	if (result.errno !== 0) {
		container.textContent += t('msg_failed_logs')
		return
	}
	container.textContent += result.stdout
	container.textContent += '\n'

	exec(`cat ${PERSISTENT_DIR}/logs.txt`).then((result) => {
		if (result.errno !== 0) {
			container.textContent += t('msg_failed_logs')
			return
		}
		container.textContent += result.stdout
	})
})

// Load brene version
exec(`grep "^version=" ${MODDIR}/module.prop | cut -d'=' -f2`).then((result) => {
	const element = document.getElementById('brene-version')
	element.innerText = result.errno === 0 ? result.stdout : 'unknown'
})

// Load susfs version
exec('susfs show version').then((result) => {
	const element = document.getElementById('susfs-version')
	element.innerText = result.errno === 0 ? `${result.stdout}+` : 'unknown'
})

function updateConfig(config, value) {
	exec(`sed -i "s/^${config}=.*/${config}=${value}/" ${PERSISTENT_DIR}/config.sh`).then((result) => {
		if (result.errno !== 0) toast(t('msg_failed_update'))
	})
}

function updateConfig2(config, value) {
	exec(`sed -i "s/^${config}=.*/${config}='${value}'/" ${PERSISTENT_DIR}/config.sh`).then((result) => {
		if (result.errno !== 0) toast(t('msg_failed_update'))
	})
}

function setFeature(cmd) {
	exec(cmd).then((result) => {
		toast(result.errno === 0 ? t('msg_no_reboot') : result.stderr)
	})
}

// Load config and add toggle event
exec(`cat ${PERSISTENT_DIR}/config.sh`).then((result) => {
	if (result.errno !== 0) {
		toast(t('msg_failed_config'))
		return
	}

	const configValues = Object.fromEntries(
		result.stdout
			.split('\n')
			.filter((line) => line.includes('='))
			.map((line) => {
				const [key, ...val] = line.split('=')
				return [
					key.trim(),
					val
						.join('=')
						.trim()
						.replace(/^['"](.*)['"]$/, '$1'),
				]
			}),
	)

	document.getElementById('custom_uname_release').value = configValues['config_custom_uname_kernel_release']
	document.getElementById('custom_uname_version').value = configValues['config_custom_uname_kernel_version']
	document.getElementById('verified_boot_hash_text_field').value = configValues['config_verified_boot_hash']

	configs.forEach((config) => {
		const configId = `config_${config.id}`
		const element = document.getElementById(config.id)
		if (!element) return

		const value = configValues[configId]
		if (value !== undefined) {
			element.selected = parseInt(value) === 1
		}

		element.addEventListener('change', async () => {
			const enabled = element.selected
			const newConfigValue = +enabled
			updateConfig(configId, newConfigValue)
			if (config.action) config.action(enabled)
		})
	})
})

// KSU Modules toggles
;(async () => {
	const enableSwitch = document.getElementById('enable_ksu_modules')
	const disableSwitch = document.getElementById('disable_ksu_modules')

	const toggleAllModules = (enable) => {
		exec(`
			for i in /data/adb/modules/*; do
				${enable ? 'rm -f' : 'touch'} "$i/disable"
			done
		`).then((result) => {
			toast(result.errno === 0 ? t('msg_success') : result.stderr)
		})
	}

	enableSwitch.addEventListener('click', () => toggleAllModules(true))
	disableSwitch.addEventListener('click', () => toggleAllModules(false))
})()

// Custom Uname buttons
;(async () => {
	const unameRelease = document.getElementById('custom_uname_release')
	const unameVersion = document.getElementById('custom_uname_version')
	const updateUname = (release, version) => {
		updateConfig2('config_custom_uname_kernel_release', release)
		updateConfig2('config_custom_uname_kernel_version', version.trim() === '' ? 'default' : version)
		setFeature(`${SUSFS_BIN} set_uname "${release}" "${version}"`)
		unameRelease.value = release
		unameVersion.value = version.trim() === '' ? 'default' : version
	}

	document.getElementById('button_custom_uname_reset').onclick = () => updateUname('default', 'default')
	document.getElementById('button_custom_uname_apply').onclick = () => {
		if (unameRelease.value !== '') updateUname(unameRelease.value, unameVersion.value)
	}
})()

// Verified Boot Hash
;(async () => {
	const textField = document.getElementById('verified_boot_hash_text_field')
	const button = document.getElementById('verified_boot_hash_button')

	button.addEventListener('click', () => {
		updateConfig2('config_verified_boot_hash', textField.value)
		toast(t('msg_success'))
	})
})()

// Custom sus map
;(async () => {
	const mapField = document.getElementById('custom_sus_map_text_field')
	const pathField = document.getElementById('custom_sus_path_text_field')
	const loopField = document.getElementById('custom_sus_path_loop_text_field')
	const applyButton = document.getElementById('unified_apply_button')
	const tabs = document.getElementById('sus_tabs')
	const scrollContainer = document.getElementById('horizontal_scroll_container')

	exec(`cat ${PERSISTENT_DIR}/custom_sus_map.txt`).then((result) => {
		mapField.value = result.errno === 0 ? `${result.stdout}\n` : ''
	})
	exec(`cat ${PERSISTENT_DIR}/custom_sus_path.txt`).then((result) => {
		pathField.value = result.errno === 0 ? `${result.stdout}\n` : ''
	})
	exec(`cat ${PERSISTENT_DIR}/custom_sus_path_loop.txt`).then((result) => {
		loopField.value = result.errno === 0 ? `${result.stdout}\n` : ''
	})

	tabs.addEventListener('change', () => {
		const index = tabs.activeTabIndex
		const width = scrollContainer.getBoundingClientRect().width
		scrollContainer.scrollTo({ left: width * index, behavior: 'smooth' })
	})

	let scrollTimeout
	scrollContainer.addEventListener('scroll', () => {
		clearTimeout(scrollTimeout)
		scrollTimeout = setTimeout(() => {
			const width = scrollContainer.getBoundingClientRect().width
			const index = Math.round(scrollContainer.scrollLeft / width)
			if (tabs.activeTabIndex !== index) {
				tabs.activeTabIndex = index
			}
		}, 50)
	})

	applyButton.onclick = () => {
		const index = tabs.activeTabIndex
		let file = ''
		let content = ''

		switch (index) {
			case 0:
				file = 'custom_sus_map.txt'
				content = mapField.value
				break
			case 1:
				file = 'custom_sus_path.txt'
				content = pathField.value
				break
			case 2:
				file = 'custom_sus_path_loop.txt'
				content = loopField.value
				break
		}

		if (file) {
			exec(`
cat <<'UNIQUE_EOF' > ${PERSISTENT_DIR}/${file}
${content}
UNIQUE_EOF
		`).then((result) => {
				toast(result.errno === 0 ? t('msg_success') : result.stderr)
			})
		}
	}
})()

// Tab switching
;(async () => {
	var btns = document.querySelectorAll('.tab-btn')
	var panels = document.querySelectorAll('.tab-panel')

	function activate(id) {
		btns.forEach(function (b) {
			b.classList.toggle('active', b.dataset.tab === id)
		})
		panels.forEach(function (p) {
			p.classList.toggle('active', p.dataset.panel === id)
		})
	}

	btns.forEach(function (btn) {
		btn.addEventListener('click', function () {
			activate(btn.dataset.tab)
			try {
				sessionStorage.setItem('brene_tab', btn.dataset.tab)
			} catch (e) {}
		})
	})

	try {
		var saved = sessionStorage.getItem('brene_tab')
		if (saved) activate(saved)
	} catch (e) {}
})()

// Swipe navigation
;(async () => {
	const tabBar = document.getElementById('tab-bar')
	const bodyContent = document
	const buttons = Array.from(tabBar.querySelectorAll('button.tab-btn'))
	const SWIPE_THRESHOLD = 60
	let currentIndex = buttons.findIndex((btn) => btn.classList.contains('active')) || 0
	let touchStartX = 0
	let touchStartY = 0

	const updateUI = (index) => {
		buttons[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
		buttons[index].click()
	}

	const changeTab = (index) => {
		if (index >= 0 && index < buttons.length) {
			currentIndex = index
			updateUI(index)
		}
	}

	bodyContent.addEventListener('touchstart', (e) => {
		touchStartX = e.touches[0].clientX
		touchStartY = e.touches[0].clientY
	}, { passive: true })

	bodyContent.addEventListener('touchend', (e) => {
		if (e.target.closest('.tab-bar') === null && e.target.closest('.app-header') === null) {
			const touchEndX = e.changedTouches[0].clientX
			const touchEndY = e.changedTouches[0].clientY
			const diffX = touchStartX - touchEndX
			const diffY = touchStartY - touchEndY

			if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffX) > Math.abs(diffY)) {
				if (diffX > 0) {
					changeTab(currentIndex + 1)
				} else {
					changeTab(currentIndex - 1)
				}
			}
		}
	}, { passive: true })

	tabBar.addEventListener('click', (e) => {
		const btn = e.target.closest('.tab-btn')
		if (btn) {
			currentIndex = buttons.indexOf(btn)
		}
	})
})()

const TRANSLATIONS = {
	en: {
		tab_status: 'Status',
		tab_android: 'Android',
		tab_hiding: 'Hiding',
		tab_spoofing: 'Spoofing',
		tab_ksu: 'KSU',
		tab_rom: 'ROM',
		tab_advanced: 'Advanced',
		tab_info: 'Info',

		sec_general: 'General',
		kernel_version: 'Kernel Version',
		sus_status: '..5.u.S Status',
		sus_desc: "SuSFS redirects the sus path to a supposed not-existing path named '..5.u.S', and this is the only way to settle the cross check of returned errno from various syscalls, but one disadvantage is that if the path itself can be written/created by the app (MANAGE_EXTERNAL_STORAGE granted), then it is futile to hide it",
		sec_recommended: 'Recommended Modules',
		sec_incompatible: 'Incompatible Modules',
		status_installed: 'Status: Installed ✅',
		status_not_installed: 'Status: Not installed',
		status_incompatible: 'Status: Installed ❌',
		status_incompatible_not: 'Status: Not installed ✅',

		word_or: 'or',
		word_example: 'Example:',

		sec_android: 'Android Settings',
		dev_options: 'Developer Options',
		dev_options_sub: 'Enable or disable developer options',
		usb_debug: 'USB Debugging',
		usb_debug_sub: 'Enable or disable USB debugging',
		wifi_debug: 'Wireless Debugging',
		wifi_debug_sub: 'Enable or disable wireless debugging',

		sec_path_hiding: 'Suspicious Paths Hiding',
		path_note: 'Important Notes:',
		path_note_sub: 'Only effective for umounted process with uid ≥ 10.000',
		path_nonstandard_sdcard: 'Non-standard /sdcard',
		path_standard: 'Standard Paths:',
		example_detections: 'Example of detections:',
		what_detects: 'What detects without this:',
		path_nonstandard_android: 'Non-standard /sdcard/Android',
		sec_other_hiding: 'Other Hiding',
		hide_sus_mnts: 'Hide Suspicious Mounts For Non-su Processes',
		hide_sus_mnts_sub: 'Prevent zygote from caching the sus mounts in memory, and to keep them hidden from /proc/self/[mounts|mountinfo|mountstat] for non-su processes',
		umount_sus: 'Umount Suspicious Mounts (2B)',
		umount_sus_500k: 'Umount Suspicious Mounts (500K, old SuSFS patches)',
		hide_injections: 'Injections Hiding',
		sec_custom_sus: 'Custom SuSFS Entries',
		sus_map_note: 'Added real file path which gets mmapped will be hidden from /proc/self/[maps|smaps|smaps_rollup|map_files|mem|pagemap]',
		sus_map_note2: 'Important Notes:',
		sus_map_note3: '- It does NOT support hiding for anon memory.',
		sus_map_note4: '- It does NOT hide any inline hooks or plt hooks cause by the injected library itself',
		sus_map_note5: '- It may not be able to evade detections by apps that implement a good injection detection',
		sus_path_sub: 'Added path and all its sub-paths will be hidden for umounted app process from several syscalls',
		sus_path_sub2: 'Please be reminded that if the target path has upper mounts then make sure the proper layer is added, otherwise it may not be effective for the target process',
		sus_path_sub3: "For paths that are read-only all the time, add them via 'add_sus_path'",
		sus_loop_sub: 'The only difference to add_sus_path is that the added sus_path via this cli will be flagged as SUS_PATH again for the app process when it is being spawned by zygote and marked umounted',
		sus_loop_sub2: 'Also it does not check if the path is existed or not, instead it checks for empty string only, so be careful what to add',
		sus_loop_sub3: "For paths that are frequently modified, we can add them via 'add_sus_path_loop'",
		btn_apply: 'APPLY',
		btn_reset: 'RESET',

		sec_spoofing: 'Spoofing Features',
		avc_log: 'AVC Log Spoofing',
		avc_log_sub: "Spoof the sus tcontext 'su' with 'u:r:priv_app:s0:c512,c768' shown in avc log in kernel",
		avc_log_sub2: 'Enabling this may sometimes make developers hard to identify the cause when they are debugging with some permission or selinux issues, so users are advised to disable this when doing so',
		cmdline_spoof: '/proc/cmdline or /proc/bootconfig Spoofing',
		cmdline_spoof_sub: 'Spoof the output of /proc/cmdline (non-gki) or /proc/bootconfig (gki) from a text file',
		cmdline_spoof_sub2: "No root process detects it for now, and this spoofing won't help much actually",
		props_spoof: 'Android System Properties Spoofing',
		props_spoof_sub: 'Spoof some android system properties',
		uname_spoof: 'Uname Spoofing',
		uname_spoof_sub: 'Spoof uname for all processes',
		uname_spoof_sub2: "Only 'release' and 'version' are spoofed as others are no longer needed",
		custom_uname: 'Custom Uname Spoofing',
		custom_uname_sub: "Spoof uname for all processes, set string to 'default' to imply the function to use original string",
		sec_vbhash: 'Android Verified Boot Hash Spoofing',

		sec_rom: 'Custom ROM',
		rom_props: 'Remove Custom ROM Properties',
		rom_props_sub: 'Some LineageOS, CrDroid and Halcyon properties',
		pif_props: 'Remove Play Integrity Fix Properties',
		pif_props_sub: 'Some Play Integrity Fix properties',
		chip_exp: 'EXPERIMENTAL',

		sec_advanced: 'Advanced / Other Features',
		brene_logs: 'BRENE Logs',
		brene_logs_sub: 'Enable or disable BRENE Logs',
		susfs_logs: 'SuSFS Logs',
		susfs_logs_sub: 'Enable or disable SuSFS log in kernel',
		selinux: 'SELinux Enforcing',
		selinux_sub: 'Enable or disable SELinux enforcing mode',

		sec_ksu: 'KernelSU Features',
		su_compat: 'SU Compat',
		su_compat_sub: "SU Compatibility Mode - allows authorized apps to gain root via traditional 'su' command",
		su_compat_warn: 'WARNING: Old SuSFS patches need this option enabled to work',
		kernel_umount: 'Kernel Umount',
		kernel_umount_sub: 'Controls whether kernel automatically unmounts modules when not needed',
		kernel_umount_warn: 'WARNING:',
		kernel_umount_warn2: '- Old SuSFS patches need this option enabled to work',
		kernel_umount_warn3: '- Umount Suspicious Mounts need this option enabled to work',
		sec_module_ctrl: 'Module Control',
		btn_disable_modules: 'Disable Modules',
		btn_enable_modules: 'Enable Modules',

		info_language_label: 'Language',
		info_language_title: 'Interface Language',
		info_language_sub: 'Select display language',
		info_kernel_features: 'Enabled Features In Kernel',
		info_logs: 'BRENE Logs',

		msg_failed_load: 'Failed to load',
		msg_failed_features: 'Failed to load enabled features',
		msg_failed_logs: 'Failed to load logs',
		msg_failed_config: 'Failed to load config',
		msg_failed_update: 'Failed to update config',
		msg_no_reboot: 'No need to reboot',
		msg_success: 'Success',
		msg_sus_found: 'Found ❌',
		msg_sus_not_found: 'Not found ✅',
	},
	ru: {
		tab_status: 'Статус',
		tab_android: 'Android',
		tab_hiding: 'Скрытие',
		tab_spoofing: 'Спуфинг',
		tab_ksu: 'KSU',
		tab_rom: 'ROM',
		tab_advanced: 'Дополнительно',
		tab_info: 'Инфо',

		sec_general: 'Общее',
		kernel_version: 'Версия ядра',
		sus_status: 'Статус ..5.u.S',
		sus_desc: "SuSFS перенаправляет sus-путь на предположительно несуществующий путь '..5.u.S'. Это единственный способ урегулировать перекрёстную проверку возвращаемого errno из различных системных вызовов. Недостаток: если приложение может записать/создать этот путь (при наличии MANAGE_EXTERNAL_STORAGE), скрытие становится бесполезным",
		sec_recommended: 'Рекомендуемые модули',
		sec_incompatible: 'Несовместимые модули',
		status_installed: 'Статус: Установлен ✅',
		status_not_installed: 'Статус: Не установлен',
		status_incompatible: 'Статус: Установлен ❌',
		status_incompatible_not: 'Статус: Не установлен ✅',

		word_or: 'или',
		word_example: 'Пример:',

		sec_android: 'Настройки Android',
		dev_options: 'Параметры разработчика',
		dev_options_sub: 'Включить или отключить параметры разработчика',
		usb_debug: 'Отладка по USB',
		usb_debug_sub: 'Включить или отключить отладку по USB',
		wifi_debug: 'Беспроводная отладка',
		wifi_debug_sub: 'Включить или отключить беспроводную отладку (ADB по Wi-Fi)',

		sec_path_hiding: 'Скрытие подозрительных путей',
		path_note: 'Важные замечания:',
		path_note_sub: 'Работает только для процессов без root с uid ≥ 10.000',
		path_nonstandard_sdcard: 'Нестандартные папки в /sdcard',
		path_standard: 'Стандартные папки (не скрываются):',
		example_detections: 'Примеры того, что будет скрыто:',
		what_detects: 'Что обнаруживает без этой опции:',
		path_nonstandard_android: 'Нестандартные папки в /sdcard/Android',
		sec_other_hiding: 'Прочее скрытие',
		hide_sus_mnts: 'Скрыть подозрительные монтирования от не-root процессов',
		hide_sus_mnts_sub: 'Запрещает zygote кешировать sus-монтирования в памяти и скрывает их из /proc/self/[mounts|mountinfo|mountstat] для процессов без root',
		umount_sus: 'Размонтировать подозрительные монтирования (2B)',
		umount_sus_500k: 'Размонтировать подозрительные монтирования (500K, старые патчи SuSFS)',
		hide_injections: 'Скрытие инъекций',
		sec_custom_sus: 'Пользовательские записи SuSFS',
		sus_map_note: 'Указанные пути к файлам, которые попадают в mmap, будут скрыты из /proc/self/[maps|smaps|smaps_rollup|map_files|mem|pagemap]',
		sus_map_note2: 'Важные замечания:',
		sus_map_note3: '— НЕ поддерживает скрытие анонимной памяти (anon memory).',
		sus_map_note4: '— НЕ скрывает inline-хуки и PLT-хуки, созданные самой внедрённой библиотекой',
		sus_map_note5: '— Может не помочь против приложений с продвинутым обнаружением инъекций',
		sus_path_sub: 'Указанный путь и все его подпути будут скрыты для размонтированных процессов приложений на уровне системных вызовов',
		sus_path_sub2: 'Если целевой путь имеет вышележащие монтирования (upper mounts), убедитесь, что добавлен правильный слой — иначе скрытие может не сработать для целевого процесса',
		sus_path_sub3: "Для путей, которые всегда доступны только для чтения, используйте 'add_sus_path'",
		sus_loop_sub: 'Отличие от add_sus_path: путь, добавленный этим методом, повторно помечается как SUS_PATH каждый раз, когда процесс приложения порождается zygote и отмечается как размонтированный',
		sus_loop_sub2: 'Путь не проверяется на существование — только на пустую строку, поэтому добавляйте осторожно',
		sus_loop_sub3: "Для путей, которые часто изменяются, используйте 'add_sus_path_loop'",
		btn_apply: 'ПРИМЕНИТЬ',
		btn_reset: 'СБРОСИТЬ',

		sec_spoofing: 'Функции спуфинга',
		avc_log: 'Спуфинг AVC-лога',
		avc_log_sub: "Подменяет контекст 'su' в AVC-логе ядра на 'u:r:priv_app:s0:c512,c768'",
		avc_log_sub2: 'Включение этой опции может затруднить разработчикам диагностику проблем с правами доступа или SELinux — отключайте её при отладке таких проблем',
		cmdline_spoof: 'Спуфинг /proc/cmdline или /proc/bootconfig',
		cmdline_spoof_sub: 'Подменяет вывод /proc/cmdline (не-GKI) или /proc/bootconfig (GKI) содержимым из текстового файла',
		cmdline_spoof_sub2: 'На данный момент ни один root-детектор не проверяет это — практической пользы мало',
		props_spoof: 'Спуфинг системных свойств Android',
		props_spoof_sub: 'Подменяет некоторые системные свойства Android',
		uname_spoof: 'Спуфинг uname',
		uname_spoof_sub: 'Подменяет uname для всех процессов',
		uname_spoof_sub2: "Подменяются только 'release' и 'version' — остальные поля уже не нужны",
		custom_uname: 'Пользовательский спуфинг uname',
		custom_uname_sub: "Подменяет uname для всех процессов. Укажите 'default', чтобы использовать оригинальное значение",
		sec_vbhash: 'Спуфинг хеша Verified Boot',

		sec_rom: 'Custom ROM',
		rom_props: 'Удалить свойства Custom ROM',
		rom_props_sub: 'Некоторые свойства LineageOS, CrDroid и Halcyon',
		pif_props: 'Удалить свойства Play Integrity Fix',
		pif_props_sub: 'Некоторые свойства, добавляемые модулем Play Integrity Fix',
		chip_exp: 'ЭКСПЕРИМЕНТАЛЬНО',

		sec_advanced: 'Дополнительные функции',
		brene_logs: 'Логи BRENE',
		brene_logs_sub: 'Включить или отключить логирование BRENE',
		susfs_logs: 'Логи SuSFS',
		susfs_logs_sub: 'Включить или отключить логирование SuSFS в ядре',
		selinux: 'SELinux Enforcing',
		selinux_sub: 'Включить или отключить принудительный режим SELinux',

		sec_ksu: 'Функции KernelSU',
		su_compat: 'SU Compat',
		su_compat_sub: "Режим совместимости SU — позволяет авторизованным приложениям получать root через классическую команду 'su'",
		su_compat_warn: 'ВНИМАНИЕ: Старые патчи SuSFS требуют эту опцию для работы',
		kernel_umount: 'Kernel Umount',
		kernel_umount_sub: 'Управляет тем, размонтирует ли ядро модули автоматически, когда они не нужны',
		kernel_umount_warn: 'ВНИМАНИЕ:',
		kernel_umount_warn2: '— Старые патчи SuSFS требуют эту опцию для работы',
		kernel_umount_warn3: '— «Размонтировать подозрительные монтирования» требует эту опцию для работы',
		sec_module_ctrl: 'Управление модулями',
		btn_disable_modules: 'Отключить все модули',
		btn_enable_modules: 'Включить все модули',

		info_language_label: 'Язык',
		info_language_title: 'Язык интерфейса',
		info_language_sub: 'Выберите язык отображения',
		info_kernel_features: 'Включённые функции в ядре',
		info_logs: 'Логи BRENE',

		msg_failed_load: 'Не удалось загрузить',
		msg_failed_features: 'Не удалось загрузить включённые функции',
		msg_failed_logs: 'Не удалось загрузить логи',
		msg_failed_config: 'Не удалось загрузить конфиг',
		msg_failed_update: 'Не удалось обновить конфиг',
		msg_no_reboot: 'Перезагрузка не требуется',
		msg_success: 'Успешно',
		msg_sus_found: 'Найден ❌',
		msg_sus_not_found: 'Не найден ✅',
	},
	uk: {
		tab_status: 'Статус',
		tab_android: 'Android',
		tab_hiding: 'Приховування',
		tab_spoofing: 'Спуфінг',
		tab_ksu: 'KSU',
		tab_rom: 'ROM',
		tab_advanced: 'Додатково',
		tab_info: 'Інфо',

		sec_general: 'Загальне',
		kernel_version: 'Версія ядра',
		sus_status: 'Статус ..5.u.S',
		sus_desc: "SuSFS перенаправляє sus-шлях на нібито неіснуючий шлях '..5.u.S'. Це єдиний спосіб врегулювати перехресну перевірку errno, що повертається різними системними викликами. Недолік: якщо застосунок може записати/створити цей шлях (за наявності MANAGE_EXTERNAL_STORAGE), приховування стає марним",
		sec_recommended: 'Рекомендовані модулі',
		sec_incompatible: 'Несумісні модулі',
		status_installed: 'Статус: Встановлено ✅',
		status_not_installed: 'Статус: Не встановлено',
		status_incompatible: 'Статус: Встановлено ❌',
		status_incompatible_not: 'Статус: Не встановлено ✅',

		word_or: 'або',
		word_example: 'Приклад:',

		sec_android: 'Налаштування Android',
		dev_options: 'Параметри розробника',
		dev_options_sub: 'Увімкнути або вимкнути параметри розробника',
		usb_debug: 'Відлагодження по USB',
		usb_debug_sub: 'Увімкнути або вимкнути відлагодження по USB',
		wifi_debug: 'Бездротове відлагодження',
		wifi_debug_sub: 'Увімкнути або вимкнути бездротове відлагодження (ADB по Wi-Fi)',

		sec_path_hiding: 'Приховування підозрілих шляхів',
		path_note: 'Важливі примітки:',
		path_note_sub: 'Працює лише для процесів без root з uid ≥ 10.000',
		path_nonstandard_sdcard: 'Нестандартні папки в /sdcard',
		path_standard: 'Стандартні папки (не приховуються):',
		example_detections: 'Приклади того, що буде приховано:',
		what_detects: 'Що виявляє без цієї опції:',
		path_nonstandard_android: 'Нестандартні папки в /sdcard/Android',
		sec_other_hiding: 'Інше приховування',
		hide_sus_mnts: 'Приховати підозрілі монтування від не-root процесів',
		hide_sus_mnts_sub: 'Забороняє zygote кешувати sus-монтування в пам\'яті та приховує їх з /proc/self/[mounts|mountinfo|mountstat] для процесів без root',
		umount_sus: 'Розмонтувати підозрілі монтування (2B)',
		umount_sus_500k: 'Розмонтувати підозрілі монтування (500K, старі патчі SuSFS)',
		hide_injections: 'Приховування ін\'єкцій',
		sec_custom_sus: 'Користувацькі записи SuSFS',
		sus_map_note: 'Вказані шляхи до файлів, які потрапляють у mmap, будуть приховані з /proc/self/[maps|smaps|smaps_rollup|map_files|mem|pagemap]',
		sus_map_note2: 'Важливі примітки:',
		sus_map_note3: '— НЕ підтримує приховування анонімної пам\'яті (anon memory).',
		sus_map_note4: '— НЕ приховує inline-хуки та PLT-хуки, створені самою впровадженою бібліотекою',
		sus_map_note5: '— Може не допомогти проти застосунків з розширеним виявленням ін\'єкцій',
		sus_path_sub: 'Вказаний шлях та всі його підшляхи будуть приховані для розмонтованих процесів застосунків на рівні системних викликів',
		sus_path_sub2: 'Якщо цільовий шлях має верхні монтування (upper mounts), переконайтесь, що додано правильний шар — інакше приховування може не спрацювати для цільового процесу',
		sus_path_sub3: "Для шляхів, які завжди доступні лише для читання, використовуйте 'add_sus_path'",
		sus_loop_sub: 'Відмінність від add_sus_path: шлях, доданий цим методом, повторно позначається як SUS_PATH щоразу, коли процес застосунку породжується zygote і позначається як розмонтований',
		sus_loop_sub2: 'Шлях не перевіряється на існування — лише на порожній рядок, тому додавайте обережно',
		sus_loop_sub3: "Для шляхів, які часто змінюються, використовуйте 'add_sus_path_loop'",
		btn_apply: 'ЗАСТОСУВАТИ',
		btn_reset: 'СКИНУТИ',

		sec_spoofing: 'Функції спуфінгу',
		avc_log: 'Спуфінг AVC-логу',
		avc_log_sub: "Підміняє контекст 'su' в AVC-лозі ядра на 'u:r:priv_app:s0:c512,c768'",
		avc_log_sub2: 'Увімкнення цієї опції може ускладнити розробникам діагностику проблем з правами доступу або SELinux — вимикайте її при налагодженні таких проблем',
		cmdline_spoof: 'Спуфінг /proc/cmdline або /proc/bootconfig',
		cmdline_spoof_sub: 'Підміняє вивід /proc/cmdline (не-GKI) або /proc/bootconfig (GKI) вмістом з текстового файлу',
		cmdline_spoof_sub2: 'Наразі жоден root-детектор це не перевіряє — практичної користі мало',
		props_spoof: 'Спуфінг системних властивостей Android',
		props_spoof_sub: 'Підміняє деякі системні властивості Android',
		uname_spoof: 'Спуфінг uname',
		uname_spoof_sub: 'Підміняє uname для всіх процесів',
		uname_spoof_sub2: "Підміняються лише 'release' та 'version' — інші поля вже не потрібні",
		custom_uname: 'Користувацький спуфінг uname',
		custom_uname_sub: "Підміняє uname для всіх процесів. Вкажіть 'default', щоб використовувати оригінальне значення",
		sec_vbhash: 'Спуфінг хешу Verified Boot',

		sec_rom: 'Custom ROM',
		rom_props: 'Видалити властивості Custom ROM',
		rom_props_sub: 'Деякі властивості LineageOS, CrDroid та Halcyon',
		pif_props: 'Видалити властивості Play Integrity Fix',
		pif_props_sub: 'Деякі властивості, що додаються модулем Play Integrity Fix',
		chip_exp: 'ЕКСПЕРИМЕНТАЛЬНО',

		sec_advanced: 'Додаткові функції',
		brene_logs: 'Логи BRENE',
		brene_logs_sub: 'Увімкнути або вимкнути логування BRENE',
		susfs_logs: 'Логи SuSFS',
		susfs_logs_sub: 'Увімкнути або вимкнути логування SuSFS в ядрі',
		selinux: 'SELinux Enforcing',
		selinux_sub: 'Увімкнути або вимкнути примусовий режим SELinux',

		sec_ksu: 'Функції KernelSU',
		su_compat: 'SU Compat',
		su_compat_sub: "Режим сумісності SU — дозволяє авторизованим застосункам отримувати root через класичну команду 'su'",
		su_compat_warn: 'УВАГА: Старі патчі SuSFS потребують цю опцію для роботи',
		kernel_umount: 'Kernel Umount',
		kernel_umount_sub: 'Керує тим, чи розмонтовує ядро модулі автоматично, коли вони не потрібні',
		kernel_umount_warn: 'УВАГА:',
		kernel_umount_warn2: '— Старі патчі SuSFS потребують цю опцію для роботи',
		kernel_umount_warn3: '— «Розмонтувати підозрілі монтування» потребує цю опцію для роботи',
		sec_module_ctrl: 'Керування модулями',
		btn_disable_modules: 'Вимкнути всі модулі',
		btn_enable_modules: 'Увімкнути всі модулі',

		info_language_label: 'Мова',
		info_language_title: 'Мова інтерфейсу',
		info_language_sub: 'Виберіть мову відображення',
		info_kernel_features: 'Увімкнені функції в ядрі',
		info_logs: 'Логи BRENE',

		msg_failed_load: 'Не вдалося завантажити',
		msg_failed_features: 'Не вдалося завантажити увімкнені функції',
		msg_failed_logs: 'Не вдалося завантажити логи',
		msg_failed_config: 'Не вдалося завантажити конфіг',
		msg_failed_update: 'Не вдалося оновити конфіг',
		msg_no_reboot: 'Перезавантаження не потрібне',
		msg_success: 'Успішно',
		msg_sus_found: 'Знайдено ❌',
		msg_sus_not_found: 'Не знайдено ✅',
	},
}

let currentLang = localStorage.getItem('brene_lang') || 'en'

function t(key) {
	return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || TRANSLATIONS['en'][key] || key
}

function applyTranslations(lang) {
	currentLang = lang
	localStorage.setItem('brene_lang', lang)
	const T = TRANSLATIONS[lang]

	document.querySelectorAll('[data-i18n]').forEach((el) => {
		const key = el.getAttribute('data-i18n')
		if (T[key] !== undefined) {
			el.textContent = T[key]
			if (el.dataset.installedColor) el.style.color = el.dataset.installedColor
		}
	})

		const susEl = document.querySelector('#sus-status .card-row__sub')
	if (susEl && susEl.dataset.susState) {
		susEl.innerText = susEl.dataset.susState === 'found' ? T.msg_sus_found : T.msg_sus_not_found
	}
}

// Language selector init
;(async () => {
	const select = document.getElementById('language-select')
	if (!select) return
	select.value = currentLang
	applyTranslations(currentLang)
	select.addEventListener('change', () => {
		applyTranslations(select.value)
	})
})()
