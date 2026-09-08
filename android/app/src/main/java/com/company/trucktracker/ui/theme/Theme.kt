package com.company.trucktracker.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = ChampagneGold,
    onPrimary = CharcoalBg,
    primaryContainer = CharcoalCard,
    onPrimaryContainer = ChampagneGoldLight,
    secondary = TextSecondary,
    onSecondary = TextPrimary,
    background = CharcoalBg,
    onBackground = TextPrimary,
    surface = CharcoalSurface,
    onSurface = TextPrimary,
    surfaceVariant = CharcoalCard,
    onSurfaceVariant = TextSecondary,
    outline = CharcoalBorder,
    error = StatusRed,
    onError = TextPrimary
)

@Composable
fun TruckTrackerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
