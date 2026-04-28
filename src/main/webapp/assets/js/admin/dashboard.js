document.addEventListener('DOMContentLoaded', function() {
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    const successColor = getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim();
    const warningColor = getComputedStyle(document.documentElement).getPropertyValue('--warning-color').trim();
    const infoColor = getComputedStyle(document.documentElement).getPropertyValue('--info-color').trim();
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-color').trim();
    const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--surface-color').trim();
    // Revenue data sets per period
    const revenueData = {
        monthly: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            revenue: [4200, 5800, 4900, 6200, 5100, 7400, 6800, 8100, 7200, 9500, 8900, 10200],
            expenses: [2800, 3200, 2900, 3400, 3100, 3800, 3500, 4200, 3900, 4800, 4200, 5100],
            totals: {
                revenue: '$48,295',
                expenses: '$28,450',
                profit: '$19,845'
            }
        },
        weekly: {
            categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            revenue: [8450, 9820, 7630, 10350],
            expenses: [5200, 6100, 4800, 6450],
            totals: {
                revenue: '$36,250',
                expenses: '$22,550',
                profit: '$13,700'
            }
        },
        daily: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            revenue: [1850, 2100, 1620, 2340, 2780, 1200, 960],
            expenses: [1100, 1350, 980, 1420, 1680, 750, 580],
            totals: {
                revenue: '$12,850',
                expenses: '$7,860',
                profit: '$4,990'
            }
        }
    };

    function formatCurrency(value) {
        return '$' + value.toLocaleString();
    }

    function updateSummary(period) {
        var totals = revenueData[period].totals;
        document.getElementById('summaryRevenue').textContent = totals.revenue;
        document.getElementById('summaryExpenses').textContent = totals.expenses;
        document.getElementById('summaryProfit').textContent = totals.profit;
    }
    // Revenue Overview Chart
    var revenueOptions = {
        series: [{
            name: 'Revenue',
            data: revenueData.monthly.revenue
        }, {
            name: 'Expenses',
            data: revenueData.monthly.expenses
        }],
        chart: {
            type: 'bar',
            height: 320,
            fontFamily: 'inherit',
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            },
            stacked: false,
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 500
            }
        },
        colors: [accentColor, successColor],
        plotOptions: {
            bar: {
                columnWidth: '50%',
                borderRadius: 4,
                borderRadiusApplication: 'end'
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        xaxis: {
            categories: revenueData.monthly.categories,
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            },
            labels: {
                style: {
                    colors: mutedColor,
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: mutedColor,
                    fontSize: '12px'
                },
                formatter: function(value) {
                    return '$' + (value / 1000).toFixed(0) + 'k';
                }
            }
        },
        grid: {
            borderColor: borderColor,
            strokeDashArray: 4,
            xaxis: {
                lines: {
                    show: false
                }
            }
        },
        legend: {
            show: false
        },
        fill: {
            opacity: 1
        },
        tooltip: {
            y: {
                formatter: function(value) {
                    return formatCurrency(value);
                }
            }
        }
    };
    var revenueChart = new ApexCharts(document.querySelector('#revenueChart'), revenueOptions);
    revenueChart.render();
    // Period tab switching
    document.querySelectorAll('.dash-chart-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.dash-chart-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            var period = tab.getAttribute('data-period');
            var data = revenueData[period];
            revenueChart.updateOptions({
                xaxis: {
                    categories: data.categories
                },
            });
            revenueChart.updateSeries([{
                name: 'Revenue',
                data: data.revenue
            },
                {
                    name: 'Expenses',
                    data: data.expenses
                }
            ]);
            updateSummary(period);
        });
    });
    // Traffic Sources Donut Chart
    var trafficOptions = {
        series: [42, 28, 18, 12],
        chart: {
            type: 'donut',
            height: 260,
            fontFamily: 'inherit'
        },
        colors: [accentColor, successColor, warningColor, infoColor],
        labels: ['Direct', 'Organic', 'Referral', 'Social'],
        plotOptions: {
            pie: {
                donut: {
                    size: '72%',
                    labels: {
                        show: true,
                        name: {
                            fontSize: '13px',
                            color: mutedColor
                        },
                        value: {
                            fontSize: '22px',
                            fontWeight: 700,
                            formatter: function(val) {
                                return val + '%';
                            }
                        },
                        total: {
                            show: true,
                            label: 'Total Visits',
                            fontSize: '13px',
                            color: mutedColor,
                            formatter: function(w) {
                                return w.globals.seriesTotals.reduce(function(a, b) {
                                    return a + b;
                                }, 0) + '%';
                            }
                        }
                    }
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            show: false
        },
        stroke: {
            width: 3,
            colors: [surfaceColor]
        }
    };
    var trafficChart = new ApexCharts(document.querySelector('#trafficChart'), trafficOptions);
    trafficChart.render();
    // Update charts on theme change
    document.addEventListener('themeChanged', function() {
        var newBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
        var newMutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-color').trim();
        var newSurfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--surface-color').trim();
        var newAccentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        var newSuccessColor = getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim();
        var newWarningColor = getComputedStyle(document.documentElement).getPropertyValue('--warning-color').trim();
        var newInfoColor = getComputedStyle(document.documentElement).getPropertyValue('--info-color').trim();
        revenueChart.updateOptions({
            colors: [newAccentColor, newSuccessColor],
            grid: {
                borderColor: newBorderColor
            },
            xaxis: {
                labels: {
                    style: {
                        colors: newMutedColor
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: newMutedColor
                    }
                }
            }
        });
        trafficChart.updateOptions({
            colors: [newAccentColor, newSuccessColor, newWarningColor, newInfoColor],
            stroke: {
                colors: [newSurfaceColor]
            }
        });
    });
});
function updateDateTime() {
    const now = new Date();

    document.getElementById("dateDisplay").textContent =
        now.toLocaleDateString("en-US", {
            weekday: "short", year: "numeric",
            month: "short", day: "numeric"
        });

    document.getElementById("timeDisplay").textContent =
        now.toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
            second: "2-digit", hour12: false
        });

    document.getElementById("tzDisplay").textContent =
        Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ");
}

updateDateTime();
setInterval(updateDateTime, 1000); // live tick every second